//! Vector graphics rasterization (.ai / .eps) via an external Ghostscript binary.
//!
//! `.ai` (v9+, PDF-compatible) and `.eps` (PostScript) cannot be decoded by the
//! `image` crate, so we shell out to Ghostscript — the same external-tool
//! pattern already used for FFmpeg (video thumbnails) and ExifTool (metadata).
//!
//! Ghostscript is *detected* at runtime and never bundled: bundling would make
//! the entire application subject to Ghostscript's AGPL license, while
//! invoking an unmodified, separately-installed binary does not.

use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicU64, Ordering};

use image::DynamicImage;
use image::GenericImageView;

use crate::services::thumbnail::resize_image;

/// Ghostscript console binary candidates, in preference order.
/// `gswin64c` / `gswin32c` are the Windows console executables.
const GHOSTSCRIPT_CANDIDATES: [&str; 3] = ["gs", "gswin64c", "gswin32c"];

/// Base DPI for the first rasterization attempt. If the result is smaller than
/// the requested target size the file is re-rendered at a proportionally
/// higher DPI (capped) so large previews stay crisp.
const BASE_DPI: f64 = 150.0;

/// Upper DPI bound to keep memory usage and latency bounded for huge artboards.
const MAX_DPI: f64 = 600.0;

static RENDER_SEQ: AtomicU64 = AtomicU64::new(0);

/// Returns `true` when `path` has a supported vector extension (`.ai` / `.eps`).
pub fn is_vector_file(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| matches!(e.to_lowercase().as_str(), "ai" | "eps"))
        .unwrap_or(false)
}

/// Locate a Ghostscript executable on the system.
fn get_ghostscript_path() -> Option<PathBuf> {
    for candidate in GHOSTSCRIPT_CANDIDATES {
        if let Ok(path) = which::which(candidate) {
            return Some(path);
        }
    }
    None
}

/// Warn (once per process) when Ghostscript is missing, so users understand
/// why .ai/.eps files fail to produce thumbnails.
fn warn_ghostscript_missing_once() {
    use std::sync::atomic::AtomicBool;
    static WARNED: AtomicBool = AtomicBool::new(false);
    if !WARNED.swap(true, Ordering::Relaxed) {
        eprintln!(
            "⚠️ Ghostscript not found — .ai/.eps support is disabled. \
             Install it to enable vector rasterization \
             (Linux: `sudo apt install ghostscript`, macOS: `brew install ghostscript`, \
             Windows: https://ghostscript.com/releases)."
        );
    }
}

/// Illustrator shim: a small PostScript program compiled into the binary from
/// `ai_shim.ps` and staged as a temp file when Ghostscript needs it. Only our
/// own shim text is ever written to disk — Ghostscript itself is never bundled,
/// so the AGPL concern documented at the top of this file stands.
const AI_SHIM: &str = include_str!("ai_shim.ps");

/// Bytes of the file header we inspect (DSC comments and the format marker all
/// live at the very start).
const HEADER_LEN: usize = 8 * 1024;

/// DSC bounding box in points: (llx, lly, urx, ury).
type BBox = (f64, f64, f64, f64);

/// Everything the Ghostscript command line needs to know about a file.
#[derive(Debug, Default, Clone)]
struct RenderSpec {
    /// Parsed `%%BoundingBox` / `%%HiResBoundingBox`.
    bbox: Option<BBox>,
    /// Header declares `EPSF-3.0`, so `-dEPSCrop` already applies the box.
    epsf_header: bool,
    /// Legacy Illustrator PostScript that references Adobe's private procsets.
    needs_ai_shim: bool,
}

/// Read the first [`HEADER_LEN`] bytes of `file_path` as text (lossily).
fn read_header(file_path: &str) -> String {
    use std::io::Read;

    let mut file = match std::fs::File::open(file_path) {
        Ok(f) => f,
        Err(_) => return String::new(),
    };
    let mut buf = vec![0u8; HEADER_LEN];
    let mut read = 0usize;
    while read < HEADER_LEN {
        match file.read(&mut buf[read..]) {
            Ok(0) => break,
            Ok(n) => read += n,
            Err(_) => break,
        }
    }
    String::from_utf8_lossy(&buf[..read]).into_owned()
}

/// Parse a single `%%Key: v1 v2 v3 v4` DSC line out of `header`.
///
/// Lines are split on `\n` *and* `\r` because legacy PostScript commonly uses
/// old-Mac line endings. `(atend)` and other non-numeric values fail to parse,
/// which lets the caller fall through to the next key.
fn parse_bbox_line(header: &str, key: &str) -> Option<BBox> {
    for line in header.split(|c| c == '\n' || c == '\r') {
        let line = line.trim();
        if !line.starts_with(key) {
            continue;
        }
        let mut values = line[key.len()..].split_whitespace();
        let llx = values.next()?.parse::<f64>().ok()?;
        let lly = values.next()?.parse::<f64>().ok()?;
        let urx = values.next()?.parse::<f64>().ok()?;
        let ury = values.next()?.parse::<f64>().ok()?;
        return Some((llx, lly, urx, ury));
    }
    None
}

/// Parse the DSC bounding box, preferring `%%BoundingBox` over `%%HiResBoundingBox`.
fn parse_bounding_box(header: &str) -> Option<BBox> {
    parse_bbox_line(header, "%%BoundingBox:")
        .or_else(|| parse_bbox_line(header, "%%HiResBoundingBox:"))
}

/// True when the file references Adobe's private Illustrator procsets and
/// therefore needs [`AI_SHIM`] to run under Ghostscript.
fn needs_ai_shim(header: &str) -> bool {
    if !header.starts_with("%!") {
        return false; // PDF-based .ai (and anything else) needs no shim.
    }
    header.contains("Adobe_level2_AI")
        || header.contains("Adobe_Illustrator_")
        || header.contains("Adobe_ColorImage_")
        || header.contains("%AI5_")
        || header.contains("%AI3_")
}

/// Classify `file_path` from its header and build the render plan for it.
fn inspect_vector_file(file_path: &str) -> RenderSpec {
    let header = read_header(file_path);
    if header.starts_with("%PDF") {
        return RenderSpec::default(); // Ghostscript's PDF interpreter handles it.
    }
    RenderSpec {
        bbox: parse_bounding_box(&header),
        epsf_header: header.lines().next().map(|l| l.contains("EPSF")).unwrap_or(false),
        needs_ai_shim: needs_ai_shim(&header),
    }
}

/// Render `file_path` with Ghostscript to a temp PNG and return its bytes.
fn render_to_png(gs: &Path, file_path: &str, dpi: f64, spec: &RenderSpec) -> Option<Vec<u8>> {
    let seq = RENDER_SEQ.fetch_add(1, Ordering::Relaxed);
    let output_path = std::env::temp_dir()
        .join(format!("descify_vector_{}_{}.png", std::process::id(), seq));

    let mut args: Vec<String> = vec![
        "-dSAFER".to_string(),
        "-dBATCH".to_string(),
        "-dNOPAUSE".to_string(),
        // Respects the EPS bounding box for real EPSF files (harmless otherwise).
        "-dEPSCrop".to_string(),
    ];

    // Page geometry from the DSC header. Ghostscript only honours -dEPSCrop
    // when the header says `EPSF-3.0`; a plain `%!PS-Adobe-3.0` file (common
    // for .ai) would otherwise render onto a Letter page, cropped to a corner.
    if let Some((llx, lly, urx, ury)) = spec.bbox {
        if !spec.epsf_header && urx > llx && ury > lly {
            args.push(format!("-dDEVICEWIDTHPOINTS={}", urx - llx));
            args.push(format!("-dDEVICEHEIGHTPOINTS={}", ury - lly));
        }
    }

    args.push("-dTextAlphaBits=4".to_string());
    args.push("-dGraphicsAlphaBits=4".to_string());
    args.push("-sDEVICE=pngalpha".to_string());
    args.push(format!("-r{}", dpi));
    args.push("-o".to_string());
    args.push(output_path.to_string_lossy().into_owned());

    // Non-zero bounding-box origin: shift the content to the page corner.
    if let Some((llx, lly, _, _)) = spec.bbox {
        if !spec.epsf_header && (llx != 0.0 || lly != 0.0) {
            args.push("-c".to_string());
            args.push(format!("{} {} translate", -llx, -lly));
        }
    }

    // Legacy Illustrator PostScript needs the procset/operator shim; PDF-based
    // .ai files must keep the plain command line. Ghostscript refuses long `-c`
    // arguments ("Command too long"), so the shim is staged as a temp file and
    // passed with `-f`.
    let shim_path = if spec.needs_ai_shim {
        let path = std::env::temp_dir().join(format!(
            "descify_ai_shim_{}_{}.ps",
            std::process::id(),
            seq
        ));
        if std::fs::write(&path, AI_SHIM).is_ok() {
            args.push("-f".to_string());
            args.push(path.to_string_lossy().into_owned());
            Some(path)
        } else {
            eprintln!("⚠️ Could not stage the Illustrator shim for {}", file_path);
            None
        }
    } else {
        None
    };

    args.push(file_path.to_string());

    // pngalpha renders with transparency; the result is flattened onto white
    // by the caller so transparent areas don't turn black in the JPEG cache.
    // Text/graphics alpha bits give smoother downscale results.
    let output = match Command::new(gs).args(&args).output() {
        Ok(output) => output,
        Err(error) => {
            if let Some(path) = &shim_path {
                let _ = std::fs::remove_file(path);
            }
            let _ = std::fs::remove_file(&output_path);
            eprintln!("Failed to run Ghostscript on {}: {}", file_path, error);
            return None;
        }
    };

    if let Some(path) = &shim_path {
        let _ = std::fs::remove_file(path);
    }

    if !output.status.success() {
        let _ = std::fs::remove_file(&output_path);
        eprintln!(
            "Ghostscript failed to rasterize {} (exit code {:?}): {}",
            file_path,
            output.status.code(),
            String::from_utf8_lossy(&output.stderr).trim()
        );
        return None;
    }

    let data = std::fs::read(&output_path).ok();
    let _ = std::fs::remove_file(&output_path);
    data
}

/// Decode PNG bytes into a `DynamicImage`.
fn decode_png(png_data: &[u8]) -> Option<DynamicImage> {
    image::ImageReader::new(std::io::Cursor::new(png_data))
        .with_guessed_format()
        .ok()?
        .decode()
        .ok()
}


/// Composite a (possibly transparent) image onto a white background.
///
/// The thumbnail cache stores JPEG, which has no alpha channel — without this
/// step every transparent pixel would be encoded as black.
fn flatten_onto_white(img: &DynamicImage) -> DynamicImage {
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();
    let mut canvas =
        image::RgbaImage::from_pixel(width, height, image::Rgba([255, 255, 255, 255]));
    image::imageops::overlay(&mut canvas, &rgba, 0, 0);
    DynamicImage::ImageRgba8(canvas)
}

/// Rasterize a vector file (.ai / .eps) into a flattened `DynamicImage`.
///
/// The returned image is NOT sized exactly to `target_size` — the caller
/// applies the shared `resize_image` / `encode_jpeg_fast` pipeline.
/// `target_size` is used to pick a rendering DPI that yields enough pixels
/// for the requested size.
///
/// Returns `None` when Ghostscript is unavailable or rendering fails.
pub fn rasterize_vector(file_path: &str, target_size: u32) -> Option<DynamicImage> {
    let gs = match get_ghostscript_path() {
        Some(gs) => gs,
        None => {
            warn_ghostscript_missing_once();
            return None;
        }
    };

    // Inspect the header once: bounding box, EPSF vs plain PostScript, and
    // whether the legacy Illustrator procset shim is required.
    let spec = inspect_vector_file(file_path);

    let img = render_to_png(&gs, file_path, BASE_DPI, &spec).and_then(|d| decode_png(&d))?;

    // If the first pass is below the requested size, re-render at a higher DPI.
    let (w, h) = img.dimensions();
    let max_dim = w.max(h);
    let img = if max_dim < target_size {
        let dpi = ((BASE_DPI * target_size as f64) / max_dim as f64).min(MAX_DPI);
        render_to_png(&gs, file_path, dpi, &spec)
            .and_then(|d| decode_png(&d))
            .unwrap_or(img)
    } else {
        img
    };

    // Bring the render down towards the requested size; render at ~2x the
    // target and let the caller fine-tune with its own resize pass.
    let img = resize_image(&img, target_size * 2);
    Some(flatten_onto_white(&img))
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_EPS: &str = "%!PS-Adobe-3.0 EPSF-3.0\n\
        %%BoundingBox: 0 0 200 100\n\
        0 0 0 setrgbcolor\n\
        10 60 moveto /Helvetica findfont 40 scalefont setfont (EPS Test) show\n\
        0 0 200 100 rectstroke\n\
        %%EOF\n";

    /// A legacy Illustrator PostScript file: no `EPSF-3.0` token in the header,
    /// references Adobe's private procsets and draws with the private operator
    /// namespace. This is the shape of `.ai` file Ghostscript refuses to run
    /// without `ai_shim.ps`.
    const SAMPLE_LEGACY_AI: &str = "%!PS-Adobe-3.0\n\
        %%BoundingBox: 0 0 200 100\n\
        %%DocumentNeededResources: procset Adobe_level2_AI5 1.0 0\n\
        %%BeginProlog\n\
        %%IncludeResource: procset Adobe_level2_AI5 1.0 0\n\
        %%EndProlog\n\
        %%BeginSetup\n\
        Adobe_level2_AI5 /initialize get exec\n\
        Adobe_Illustrator_AI5_vars Adobe_Illustrator_AI5 Adobe_typography_AI5 /initialize get exec\n\
        Adobe_Illustrator_AI5 /initialize get exec\n\
        %%EndSetup\n\
        %AI5_BeginLayer\n\
        1 1 1 1 0 0 0 79 128 255 Lb\n\
        (Layer 1) Ln\n\
        10.43 M\n\
        0.09375 w\n\
        [] 0.0000 d\n\
        u\n\
        1.000 1.000 1.000 Xa\n\
        u\n\
        *u\n\
        0.00 100.00 m\n\
        200.00 100.00 L\n\
        200.00 0.00 L\n\
        0.00 0.00 L\n\
        0.00 100.00 L\n\
        f\n\
        40.00 60.00 m\n\
        160.00 60.00 160.00 40.00 40.00 40.00 C\n\
        0.00 0.00 0.00 1.000 Xa\n\
        f\n\
        *U\n\
        U\n\
        U\n\
        LB\n\
        %AI5_EndLayer--\n\
        %%PageTrailer\n\
        gsave annotatepage grestore showpage\n\
        %%Trailer\n\
        Adobe_Illustrator_AI5 /terminate get exec\n\
        Adobe_level2_AI5 /terminate get exec\n\
        %%EOF\n";

    #[test]
    fn detects_vector_extensions() {
        assert!(is_vector_file(Path::new("/tmp/logo.ai")));
        assert!(is_vector_file(Path::new("/tmp/logo.EPS")));
        assert!(is_vector_file(Path::new("/tmp/logo.Ai")));
        assert!(!is_vector_file(Path::new("/tmp/logo.png")));
        assert!(!is_vector_file(Path::new("/tmp/logo")));
        assert!(!is_vector_file(Path::new("/tmp/ai.txt")));
    }

    #[test]
    fn parses_dsc_bounding_box() {
        // Plain PostScript with old-Mac line endings.
        let plain = "%!PS-Adobe-3.0\r%%Title: x\r%%BoundingBox: 0 0 1376 768\r%%EOF";
        assert_eq!(parse_bounding_box(plain), Some((0.0, 0.0, 1376.0, 768.0)));

        // `(atend)` defers the box — fall through to the HiRes variant.
        let atend = "%!PS-Adobe-3.0\n%%BoundingBox: (atend)\n%%HiResBoundingBox: 10.5 20 210.5 120\n";
        assert_eq!(parse_bounding_box(atend), Some((10.5, 20.0, 210.5, 120.0)));

        assert_eq!(parse_bounding_box("%PDF-1.6\n1 0 obj\n"), None);
    }

    #[test]
    fn detects_legacy_illustrator_postscript() {
        let legacy = "%!PS-Adobe-3.0\n\
            %%DocumentNeededResources: procset Adobe_level2_AI5 1.0 0\n\
            %%BoundingBox: 0 0 200 100\n";
        assert!(needs_ai_shim(legacy));

        // PDF-based .ai (v9+) needs no shim.
        assert!(!needs_ai_shim("%PDF-1.6\n1 0 obj\n<</OCProperties>>\n"));

        // A plain EPS is PostScript but has nothing to shim.
        assert!(!needs_ai_shim("%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 10 10\n"));
    }

    #[test]
    fn rasterizes_eps_file() {
        // Skip gracefully when Ghostscript is not installed (e.g. CI containers).
        if get_ghostscript_path().is_none() {
            eprintln!("Ghostscript not installed — skipping rasterization test");
            return;
        }

        let dir = std::env::temp_dir()
            .join(format!("descify_vector_test_{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let eps_path = dir.join("test.eps");
        std::fs::write(&eps_path, SAMPLE_EPS).unwrap();

        let img = rasterize_vector(eps_path.to_str().unwrap(), 720)
            .expect("EPS rasterization should succeed");

        let (w, h) = img.dimensions();
        assert!(w > 0 && h > 0, "rasterized image must have non-zero dimensions");
        // BoundingBox is 200x100 (2:1) — verify -dEPSCrop was respected.
        let ratio = w as f64 / h as f64;
        assert!(
            (ratio - 2.0).abs() < 0.1,
            "expected ~2:1 aspect ratio, got {}x{}",
            w,
            h
        );

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn rasterizes_legacy_illustrator_postscript() {
        // Skip gracefully when Ghostscript is not installed (e.g. CI containers).
        if get_ghostscript_path().is_none() {
            eprintln!("Ghostscript not installed — skipping rasterization test");
            return;
        }

        let dir = std::env::temp_dir()
            .join(format!("descify_ai_test_{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let ai_path = dir.join("legacy.ai");
        std::fs::write(&ai_path, SAMPLE_LEGACY_AI).unwrap();
        let ai_str = ai_path.to_str().unwrap();

        // The header must be classified before rendering.
        let spec = inspect_vector_file(ai_str);
        assert!(spec.needs_ai_shim, "legacy .ai must be flagged for the shim");
        assert!(!spec.epsf_header, "sample header has no EPSF token");
        assert_eq!(spec.bbox, Some((0.0, 0.0, 200.0, 100.0)));

        // Without the shim Ghostscript dies on `/undefined in Adobe_level2_AI5`;
        // without the bounding box it renders onto a Letter page (612x792).
        let img = rasterize_vector(ai_str, 720)
            .expect("legacy Illustrator PostScript should rasterize");

        let (w, h) = img.dimensions();
        assert!(w > 0 && h > 0, "rasterized image must have non-zero dimensions");
        let ratio = w as f64 / h as f64;
        assert!(
            (ratio - 2.0).abs() < 0.1,
            "expected ~2:1 aspect ratio from %%BoundingBox, got {}x{}",
            w,
            h
        );

        // The shim's private operators must actually draw something.
        let rgba = img.to_rgba8();
        let inked = rgba
            .pixels()
            .filter(|p| p.0[0] < 250 || p.0[1] < 250 || p.0[2] < 250)
            .count();
        assert!(inked > 0, "expected at least one non-white pixel");

        let _ = std::fs::remove_dir_all(&dir);
    }
}


