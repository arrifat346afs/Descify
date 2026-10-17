#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};

use base64::Engine;
use blake3::Hasher;
use image::imageops::FilterType;
use image::GenericImageView;
use image::{DynamicImage, ImageReader};

use crate::services::gpu_thumbnail;
use crate::services::vector;

fn max_ffmpeg_jobs() -> usize {
    let cores = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4);
    (cores / 2).clamp(2, 4)
}

static FFMPEG_SEMAPHORE: std::sync::LazyLock<tokio::sync::Semaphore> =
    std::sync::LazyLock::new(|| tokio::sync::Semaphore::new(max_ffmpeg_jobs()));

const FFMPEG_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(12);

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ThumbnailResult {
    /// Base64-encoded JPEG, populated **only** when the thumbnail could not be
    /// written to disk (i.e. `cache_path` is None).  Prefer `cache_path`.
    pub thumbnail_base64: Option<String>,
    /// Absolute path to the JPEG on disk inside the app's thumbnail cache dir.
    /// The frontend should load this via `convertFileSrc` to avoid copying the
    /// image data through the IPC bridge and into the JS heap.
    pub cache_path: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub file_size: Option<u64>,
    pub from_cache: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PreviewResult {
    /// Base64-encoded JPEG, populated **only** when the preview could not be
    /// written to disk (i.e. `cache_path` is None).  Prefer `cache_path`.
    pub preview_base64: Option<String>,
    /// Absolute path to the JPEG on disk inside the app's thumbnail cache dir.
    pub cache_path: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub from_cache: bool,
}

fn get_app_thumbnail_cache_dir() -> Option<PathBuf> {
    dirs::cache_dir().map(|d| d.join("descify").join("thumbnails"))
}

fn compute_cache_key(file_path: &str, mtime: u64, size: u64) -> String {
    let mut hasher = Hasher::new();
    hasher.update(file_path.as_bytes());
    hasher.update(b"|".as_ref());
    hasher.update(mtime.to_string().as_bytes());
    hasher.update(b"|".as_ref());
    hasher.update(size.to_string().as_bytes());
    hasher.finalize().to_hex().to_string()
}

fn get_file_metadata(path: &str) -> Option<(u64, u64)> {
    let metadata = fs::metadata(path).ok()?;
    let mtime = metadata
        .modified()
        .ok()?
        .duration_since(std::time::UNIX_EPOCH)
        .ok()?
        .as_secs();
    let size = metadata.len();
    Some((mtime, size))
}

fn read_image_from_file(path: &PathBuf) -> Option<DynamicImage> {
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase());

    let is_raw = matches!(
        extension.as_deref(),
        Some("raw")
            | Some("cr2")
            | Some("cr3")
            | Some("nef")
            | Some("arw")
            | Some("orf")
            | Some("rw2")
            | Some("dng")
            | Some("raf")
            | Some("srw")
            | Some("pef")
    );

    if is_raw {
        return None;
    }

    let file = File::open(path).ok()?;
    let file_size = file.metadata().ok()?.len();

    if file_size > 500_000_000 {
        return None;
    }

    let mmap = match unsafe { memmap2::Mmap::map(&file) } {
        Ok(m) => m,
        Err(_) => return None,
    };

    ImageReader::new(std::io::Cursor::new(&mmap))
        .with_guessed_format()
        .ok()?
        .decode()
        .ok()
}

pub(crate) fn resize_image(img: &DynamicImage, target_size: u32) -> DynamicImage {
    let (w, h) = img.dimensions();
    let max_dim = w.max(h);

    if max_dim <= target_size {
        return img.clone();
    }

    let scale = target_size as f32 / max_dim as f32;
    let new_w = (w as f32 * scale) as u32;
    let new_h = (h as f32 * scale) as u32;

    img.resize(new_w, new_h, FilterType::Triangle)
}

fn encode_jpeg_fast(img: &DynamicImage) -> Vec<u8> {
    let rgb = img.to_rgb8();
    let (width, height) = rgb.dimensions();
    let mut buffer = Vec::with_capacity((width * height / 2) as usize);
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, 70);
    encoder.encode_image(&rgb).ok();
    buffer
}

/// Returns the path to a cached thumbnail file if it already exists on disk,
/// without reading or decoding the file contents (avoids unnecessary I/O).
fn get_cached_thumbnail_path(cache_dir: &Path, cache_key: &str) -> Option<PathBuf> {
    let thumb_path = cache_dir.join(format!("{}.jpg", cache_key));
    if thumb_path.exists() {
        Some(thumb_path)
    } else {
        None
    }
}

/// Writes `jpeg_data` to the cache directory and returns the resulting path on
/// success, or `None` if the write failed.  Callers fall back to returning
/// base64-encoded data when this function returns `None`.
fn save_thumbnail_to_cache(
    cache_dir: &PathBuf,
    cache_key: &str,
    jpeg_data: &[u8],
) -> Option<PathBuf> {
    if !cache_dir.exists() {
        fs::create_dir_all(cache_dir).ok()?;
    }
    let thumb_path = cache_dir.join(format!("{}.jpg", cache_key));
    let mut file = File::create(&thumb_path).ok()?;
    file.write_all(jpeg_data).ok()?;
    evict_oldest(cache_dir);
    Some(thumb_path)
}

/// Thumbnails are never deleted anywhere else, so the on-disk
/// cache would grow for the life of the install. Keep the newest
/// MAX_CACHE_FILES entries and remove the rest by modification time.
const MAX_CACHE_FILES: usize = 5000;

fn evict_oldest(cache_dir: &PathBuf) {
    let Ok(entries) = fs::read_dir(cache_dir) else {
        return;
    };
    let mut files: Vec<(std::time::SystemTime, PathBuf)> = entries
        .flatten()
        .filter_map(|entry| {
            entry
                .metadata()
                .ok()
                .and_then(|meta| meta.modified().ok())
                .map(|modified| (modified, entry.path()))
        })
        .collect();
    if files.len() <= MAX_CACHE_FILES {
        return;
    }
    files.sort_by_key(|(modified, _)| *modified);
    let excess = files.len() - MAX_CACHE_FILES;
    for (_, path) in files.into_iter().take(excess) {
        let _ = fs::remove_file(path);
    }
}

pub fn generate_thumbnail(file_path: &str, target_size: u32) -> ThumbnailResult {
    let path = PathBuf::from(file_path);
    if !path.exists() || !path.is_file() {
        return ThumbnailResult {
            thumbnail_base64: None,
            cache_path: None,
            width: None,
            height: None,
            file_size: None,
            from_cache: false,
        };
    }

    let file_meta = match get_file_metadata(file_path) {
        Some(m) => m,
        None => {
            return ThumbnailResult {
                thumbnail_base64: None,
                cache_path: None,
                width: None,
                height: None,
                file_size: None,
                from_cache: false,
            }
        }
    };
    let (file_mtime, file_size) = file_meta;

    let cache_key = compute_cache_key(file_path, file_mtime, file_size);
    let cache_dir = match get_app_thumbnail_cache_dir() {
        Some(d) => d,
        None => {
            return ThumbnailResult {
                thumbnail_base64: None,
                cache_path: None,
                width: None,
                height: None,
                file_size: None,
                from_cache: false,
            }
        }
    };

    // Cache hit: return the on-disk path without reading or re-encoding the file.
    // The frontend loads it via the asset:// protocol (convertFileSrc).
    if let Some(cached_path) = get_cached_thumbnail_path(&cache_dir, &cache_key) {
        return ThumbnailResult {
            thumbnail_base64: None,
            cache_path: Some(cached_path.to_string_lossy().into_owned()),
            width: None,
            height: None,
            file_size: Some(file_size),
            from_cache: true,
        };
    }

    // Vector formats (.ai / .eps) cannot be decoded by the `image` crate —
    // rasterize them through the Ghostscript-backed vector service instead.
    let img = if vector::is_vector_file(&path) {
        match vector::rasterize_vector(file_path, target_size) {
            Some(i) => i,
            None => {
                return ThumbnailResult {
                    thumbnail_base64: None,
                    cache_path: None,
                    width: None,
                    height: None,
                    file_size: Some(file_size),
                    from_cache: false,
                }
            }
        }
    } else {
        match read_image_from_file(&path) {
            Some(i) => i,
            None => {
                return ThumbnailResult {
                    thumbnail_base64: None,
                    cache_path: None,
                    width: None,
                    height: None,
                    file_size: Some(file_size),
                    from_cache: false,
                }
            }
        }
    };

    let resized = resize_image(&img, target_size);
    let (width, height) = resized.dimensions();
    let jpeg_data = encode_jpeg_fast(&resized);

    // Prefer returning a path so the image never has to cross the IPC bridge as
    // base64.  Fall back to base64 only if the disk write failed.
    let (cache_path, thumbnail_base64) =
        match save_thumbnail_to_cache(&cache_dir, &cache_key, &jpeg_data) {
            Some(p) => (Some(p.to_string_lossy().into_owned()), None),
            None => (
                None,
                Some(base64::engine::general_purpose::STANDARD.encode(&jpeg_data)),
            ),
        };

    ThumbnailResult {
        thumbnail_base64,
        cache_path,
        width: Some(width),
        height: Some(height),
        file_size: Some(file_size),
        from_cache: false,
    }
}

pub fn generate_preview(file_path: &str, target_size: u32) -> PreviewResult {
    let path = PathBuf::from(file_path);
    if !path.exists() || !path.is_file() {
        return PreviewResult {
            preview_base64: None,
            cache_path: None,
            width: None,
            height: None,
            from_cache: false,
        };
    }

    let file_meta = match get_file_metadata(file_path) {
        Some(m) => m,
        None => {
            return PreviewResult {
                preview_base64: None,
                cache_path: None,
                width: None,
                height: None,
                from_cache: false,
            }
        }
    };
    let (file_mtime, _file_size) = file_meta;

    let cache_key = format!("preview_{}", compute_cache_key(file_path, file_mtime, 0));
    let cache_dir = match get_app_thumbnail_cache_dir() {
        Some(d) => d,
        None => {
            return PreviewResult {
                preview_base64: None,
                cache_path: None,
                width: None,
                height: None,
                from_cache: false,
            }
        }
    };

    if let Some(cached_path) = get_cached_thumbnail_path(&cache_dir, &cache_key) {
        return PreviewResult {
            preview_base64: None,
            cache_path: Some(cached_path.to_string_lossy().into_owned()),
            width: None,
            height: None,
            from_cache: true,
        };
    }

    // Vector formats (.ai / .eps) cannot be decoded by the `image` crate —
    // rasterize them through the Ghostscript-backed vector service instead.
    let img = if vector::is_vector_file(&path) {
        match vector::rasterize_vector(file_path, target_size) {
            Some(i) => i,
            None => {
                return PreviewResult {
                    preview_base64: None,
                    cache_path: None,
                    width: None,
                    height: None,
                    from_cache: false,
                }
            }
        }
    } else {
        match read_image_from_file(&path) {
            Some(i) => i,
            None => {
                return PreviewResult {
                    preview_base64: None,
                    cache_path: None,
                    width: None,
                    height: None,
                    from_cache: false,
                }
            }
        }
    };

    let resized = resize_image(&img, target_size);
    let (width, height) = resized.dimensions();
    let jpeg_data = encode_jpeg_fast(&resized);

    let (cache_path, preview_base64) =
        match save_thumbnail_to_cache(&cache_dir, &cache_key, &jpeg_data) {
            Some(p) => (Some(p.to_string_lossy().into_owned()), None),
            None => (
                None,
                Some(base64::engine::general_purpose::STANDARD.encode(&jpeg_data)),
            ),
        };

    PreviewResult {
        preview_base64,
        cache_path,
        width: Some(width),
        height: Some(height),
        from_cache: false,
    }
}

fn get_ffmpeg_path() -> Option<PathBuf> {
    let exe_dir = std::env::current_exe().ok()?.parent()?.to_path_buf();
    let ffmpeg = exe_dir.join("ffmpeg-x86_64-unknown-linux-gnu-x86_64-unknown-linux-gnu");
    if ffmpeg.exists() {
        return Some(ffmpeg);
    }
    let ffmpeg = exe_dir.join("ffmpeg");
    if ffmpeg.exists() {
        return Some(ffmpeg);
    }
    which::which("ffmpeg").ok()
}

async fn run_ffmpeg_thumbnail_attempt(
    ffmpeg: &Path,
    file_path: &str,
    target_size: u32,
    seek_time: &str,
    skip_key: bool,
    use_gpu: bool,
) -> Option<Vec<u8>> {
    let mut cmd = tokio::process::Command::new(ffmpeg);
    cmd.kill_on_drop(true);
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::null());
    cmd.stdin(std::process::Stdio::null());

    cmd.arg("-ss").arg(seek_time);
    cmd.arg("-noaccurate_seek");
    if skip_key {
        cmd.arg("-skip_frame").arg("nokey");
    }
    cmd.arg("-probesize").arg("32768");
    cmd.arg("-analyzeduration").arg("0");

    if use_gpu {
        for arg in gpu_thumbnail::get_ffmpeg_hwaccel_args() {
            cmd.arg(arg);
        }
    }

    cmd.arg("-i").arg(file_path);
    cmd.arg("-an").arg("-sn").arg("-dn");
    cmd.arg("-frames:v").arg("1");
    cmd.arg("-threads").arg("1");
    cmd.arg("-vf").arg(format!("scale={target_size}:{target_size}:force_original_aspect_ratio=decrease"));
    cmd.arg("-sws_flags").arg("fast_bilinear");
    cmd.arg("-q:v").arg("2");
    cmd.arg("-f").arg("image2pipe");
    cmd.arg("-c:v").arg("mjpeg");
    cmd.arg("pipe:1");

    let child = cmd.spawn().ok()?;
    let output = match tokio::time::timeout(FFMPEG_TIMEOUT, child.wait_with_output()).await {
        Ok(Ok(out)) => out,
        _ => return None,
    };

    if output.status.success()
        && output.stdout.len() >= 2
        && output.stdout[0] == 0xFF
        && output.stdout[1] == 0xD8
    {
        Some(output.stdout)
    } else {
        None
    }
}

async fn generate_video_thumbnail_ffmpeg_async(
    file_path: &str,
    target_size: u32,
) -> Option<(Vec<u8>, u32, u32)> {
    let ffmpeg = get_ffmpeg_path()?;
    let _permit = FFMPEG_SEMAPHORE.acquire().await.ok()?;

    let use_gpu = gpu_thumbnail::is_gpu_faster();

    // 1. Fast attempt: seek to 1 second with skip_frame nokey
    let maybe_data =
        run_ffmpeg_thumbnail_attempt(&ffmpeg, file_path, target_size, "00:00:01", true, use_gpu)
            .await;

    // 2. Fallback to 0s with skip_frame nokey (for videos < 1s or where no keyframe follows 1s)
    let maybe_data = match maybe_data {
        Some(d) => Some(d),
        None => {
            run_ffmpeg_thumbnail_attempt(&ffmpeg, file_path, target_size, "00:00:00", true, use_gpu)
                .await
        }
    };

    // 3. Fallback to 0s without skip_frame nokey (for formats where nokey decode is unsupported)
    let data = match maybe_data {
        Some(d) => d,
        None => {
            run_ffmpeg_thumbnail_attempt(&ffmpeg, file_path, target_size, "00:00:00", false, false)
                .await?
        }
    };

    // Extract dimensions from JPEG header without decoding pixel data
    let (width, height) = match ImageReader::new(std::io::Cursor::new(&data))
        .with_guessed_format()
        .ok()
        .and_then(|r| r.into_dimensions().ok())
    {
        Some((w, h)) => (w, h),
        None => (target_size, target_size),
    };

    Some((data, width, height))
}

pub async fn generate_video_thumbnail(file_path: &str, target_size: u32) -> ThumbnailResult {
    let path = PathBuf::from(file_path);
    if !path.exists() || !path.is_file() {
        return ThumbnailResult {
            thumbnail_base64: None,
            cache_path: None,
            width: None,
            height: None,
            file_size: None,
            from_cache: false,
        };
    }

    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase());

    let is_video = matches!(
        extension.as_deref(),
        Some("mp4")
            | Some("mov")
            | Some("webm")
            | Some("avi")
            | Some("mkv")
            | Some("flv")
            | Some("wmv")
            | Some("m4v")
            | Some("3gp")
            | Some("ogv")
            | Some("mts")
            | Some("m2ts")
    );

    if !is_video {
        return ThumbnailResult {
            thumbnail_base64: None,
            cache_path: None,
            width: None,
            height: None,
            file_size: None,
            from_cache: false,
        };
    }

    let file_meta = match get_file_metadata(file_path) {
        Some(m) => m,
        None => {
            return ThumbnailResult {
                thumbnail_base64: None,
                cache_path: None,
                width: None,
                height: None,
                file_size: None,
                from_cache: false,
            }
        }
    };
    let (file_mtime, file_size) = file_meta;

    let cache_key = format!(
        "video_{}",
        compute_cache_key(file_path, file_mtime, file_size)
    );
    let cache_dir = match get_app_thumbnail_cache_dir() {
        Some(d) => d,
        None => {
            return ThumbnailResult {
                thumbnail_base64: None,
                cache_path: None,
                width: None,
                height: None,
                file_size: None,
                from_cache: false,
            }
        }
    };

    if let Some(cached_path) = get_cached_thumbnail_path(&cache_dir, &cache_key) {
        return ThumbnailResult {
            thumbnail_base64: None,
            cache_path: Some(cached_path.to_string_lossy().into_owned()),
            width: None,
            height: None,
            file_size: Some(file_size),
            from_cache: true,
        };
    }

    let (jpeg_data, width, height) =
        match generate_video_thumbnail_ffmpeg_async(file_path, target_size).await {
            Some(result) => result,
            None => {
                return ThumbnailResult {
                    thumbnail_base64: None,
                    cache_path: None,
                    width: None,
                    height: None,
                    file_size: Some(file_size),
                    from_cache: false,
                }
            }
        };

    let (cache_path, thumbnail_base64) =
        match save_thumbnail_to_cache(&cache_dir, &cache_key, &jpeg_data) {
            Some(p) => (Some(p.to_string_lossy().into_owned()), None),
            None => (
                None,
                Some(base64::engine::general_purpose::STANDARD.encode(&jpeg_data)),
            ),
        };

    ThumbnailResult {
        thumbnail_base64,
        cache_path,
        width: Some(width),
        height: Some(height),
        file_size: Some(file_size),
        from_cache: false,
    }
}

pub async fn generate_video_preview(file_path: &str, target_size: u32) -> PreviewResult {
    let path = PathBuf::from(file_path);
    if !path.exists() || !path.is_file() {
        return PreviewResult {
            preview_base64: None,
            cache_path: None,
            width: None,
            height: None,
            from_cache: false,
        };
    }

    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase());

    let is_video = matches!(
        extension.as_deref(),
        Some("mp4")
            | Some("mov")
            | Some("webm")
            | Some("avi")
            | Some("mkv")
            | Some("flv")
            | Some("wmv")
            | Some("m4v")
            | Some("3gp")
            | Some("ogv")
            | Some("mts")
            | Some("m2ts")
    );

    if !is_video {
        return PreviewResult {
            preview_base64: None,
            cache_path: None,
            width: None,
            height: None,
            from_cache: false,
        };
    }

    let file_meta = match get_file_metadata(file_path) {
        Some(m) => m,
        None => {
            return PreviewResult {
                preview_base64: None,
                cache_path: None,
                width: None,
                height: None,
                from_cache: false,
            }
        }
    };
    let (file_mtime, _file_size) = file_meta;

    let cache_key = format!(
        "video_preview_{}",
        compute_cache_key(file_path, file_mtime, 0)
    );
    let cache_dir = match get_app_thumbnail_cache_dir() {
        Some(d) => d,
        None => {
            return PreviewResult {
                preview_base64: None,
                cache_path: None,
                width: None,
                height: None,
                from_cache: false,
            }
        }
    };

    if let Some(cached_path) = get_cached_thumbnail_path(&cache_dir, &cache_key) {
        return PreviewResult {
            preview_base64: None,
            cache_path: Some(cached_path.to_string_lossy().into_owned()),
            width: None,
            height: None,
            from_cache: true,
        };
    }

    let (jpeg_data, width, height) =
        match generate_video_thumbnail_ffmpeg_async(file_path, target_size).await {
            Some(result) => result,
            None => {
                return PreviewResult {
                    preview_base64: None,
                    cache_path: None,
                    width: None,
                    height: None,
                    from_cache: false,
                }
            }
        };

    let (cache_path, preview_base64) =
        match save_thumbnail_to_cache(&cache_dir, &cache_key, &jpeg_data) {
            Some(p) => (Some(p.to_string_lossy().into_owned()), None),
            None => (
                None,
                Some(base64::engine::general_purpose::STANDARD.encode(&jpeg_data)),
            ),
        };

    PreviewResult {
        preview_base64,
        cache_path,
        width: Some(width),
        height: Some(height),
        from_cache: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_batch_50_videos() {
        let bench_dir = std::path::PathBuf::from("/tmp/descify_bench_50");
        if !bench_dir.exists() {
            return;
        }

        let mut entries: Vec<PathBuf> = std::fs::read_dir(&bench_dir)
            .unwrap()
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| p.extension().map_or(false, |ext| ext == "mp4"))
            .collect();
        entries.sort();

        if entries.len() != 50 {
            return;
        }

        // Clean out cache directory for these benchmark files so repeat test runs are cold
        if let Some(cache_dir) = get_app_thumbnail_cache_dir() {
            let _ = std::fs::remove_dir_all(&cache_dir);
        }

        let start = std::time::Instant::now();
        let mut first_thumb_time = None;

        let mut handles = Vec::new();
        for path in entries {
            let p = path.to_string_lossy().to_string();
            handles.push(tokio::spawn(async move {
                let t0 = std::time::Instant::now();
                let res = generate_video_thumbnail(&p, 720).await;
                (p, res, t0.elapsed())
            }));
        }

        let mut success_count = 0;
        let mut fail_count = 0;
        let mut corrupt_failed = false;
        let mut sub1s_succeeded = false;
        let mut portrait_succeeded = false;
        let mut k4_succeeded = false;

        for h in handles {
            let (path, res, _elapsed) = h.await.unwrap();
            if first_thumb_time.is_none() && (res.cache_path.is_some() || res.thumbnail_base64.is_some()) {
                first_thumb_time = Some(start.elapsed());
            }

            if path.contains("video_corrupt") {
                if res.cache_path.is_none() && res.thumbnail_base64.is_none() {
                    corrupt_failed = true;
                }
                fail_count += 1;
            } else {
                assert!(
                    res.cache_path.is_some() || res.thumbnail_base64.is_some(),
                    "Thumbnail should succeed for {}",
                    path
                );
                success_count += 1;
                if path.contains("video_sub1s") {
                    sub1s_succeeded = true;
                }
                if path.contains("video_portrait") {
                    portrait_succeeded = true;
                    assert!(
                        res.height.unwrap_or(0) > res.width.unwrap_or(0),
                        "Portrait height ({:?}) should be > width ({:?})",
                        res.height,
                        res.width
                    );
                }
                if path.contains("video_4k") {
                    k4_succeeded = true;
                }
            }
        }

        let total_time = start.elapsed();
        println!("\n=== 50 Videos Benchmark Results ===");
        println!("Total time: {:?}", total_time);
        println!("First thumbnail ready in: {:?}", first_thumb_time.unwrap_or_default());
        println!("Success: {} / 50, Failed (corrupt): {} / 50", success_count, fail_count);
        println!("Average time per video: {:?}", total_time / 50);

        assert!(corrupt_failed, "Corrupt video should be explicitly marked failed");
        assert!(sub1s_succeeded, "Sub-1s video should succeed");
        assert!(portrait_succeeded, "Portrait video should succeed with correct aspect ratio");
        assert!(k4_succeeded, "4K video should succeed");
        assert_eq!(success_count, 49);
        assert_eq!(fail_count, 1);
    }

    #[tokio::test]
    async fn test_process_limit_and_back_to_back_batches() {
        let bench_dir = std::path::PathBuf::from("/tmp/descify_bench_50");
        if !bench_dir.exists() {
            return;
        }

        let mut entries: Vec<PathBuf> = std::fs::read_dir(&bench_dir)
            .unwrap()
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| p.extension().map_or(false, |ext| ext == "mp4"))
            .collect();
        entries.sort();

        if entries.len() != 50 {
            return;
        }

        // Clean cache so all 50 run through ffmpeg
        if let Some(cache_dir) = get_app_thumbnail_cache_dir() {
            let _ = std::fs::remove_dir_all(&cache_dir);
        }

        // Monitor max ffmpeg processes running concurrently
        let max_procs = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let max_procs_clone = max_procs.clone();
        let stop_monitoring = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let stop_clone = stop_monitoring.clone();

        let monitor_handle = tokio::spawn(async move {
            while !stop_clone.load(std::sync::atomic::Ordering::Relaxed) {
                // Count ffmpeg processes
                if let Ok(out) = std::process::Command::new("pgrep").arg("-x").arg("ffmpeg").output() {
                    if out.status.success() {
                        let lines = String::from_utf8_lossy(&out.stdout)
                            .lines()
                            .filter(|l| !l.trim().is_empty())
                            .count();
                        max_procs_clone.fetch_max(lines, std::sync::atomic::Ordering::Relaxed);
                    }
                }
                tokio::time::sleep(std::time::Duration::from_millis(15)).await;
            }
        });

        // Launch first batch of 50
        let mut handles = Vec::new();
        for path in &entries {
            let p = path.to_string_lossy().to_string();
            handles.push(tokio::spawn(async move {
                generate_video_thumbnail(&p, 720).await
            }));
        }

        // Mid-way through (after 50ms), launch second batch of 50 (back-to-back drop)
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        for path in &entries {
            let p = path.to_string_lossy().to_string();
            handles.push(tokio::spawn(async move {
                generate_video_thumbnail(&p, 720).await
            }));
        }

        // Await all 100 tasks
        for h in handles {
            let _ = h.await;
        }

        stop_monitoring.store(true, std::sync::atomic::Ordering::Relaxed);
        let _ = monitor_handle.await;

        let peak_procs = max_procs.load(std::sync::atomic::Ordering::Relaxed);
        println!("\n=== Concurrency Monitor Results ===");
        println!("Peak concurrent ffmpeg processes observed: {}", peak_procs);

        // Check running ffmpeg processes after finish
        let final_procs = if let Ok(out) = std::process::Command::new("pgrep").arg("-x").arg("ffmpeg").output() {
            String::from_utf8_lossy(&out.stdout).lines().filter(|l| !l.trim().is_empty()).count()
        } else {
            0
        };
        println!("Final ffmpeg processes remaining: {}", final_procs);

        assert!(peak_procs <= 4, "Observed {} ffmpeg processes, expected <= 4", peak_procs);
        assert_eq!(final_procs, 0, "No ffmpeg processes should remain running");
    }

    #[tokio::test]
    async fn test_exif_concurrency_and_cleanup() {
        let bench_dir = std::path::PathBuf::from("/tmp/descify_bench_50");
        if !bench_dir.exists() {
            return;
        }

        let entries: Vec<PathBuf> = std::fs::read_dir(&bench_dir)
            .unwrap()
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| p.extension().map_or(false, |ext| ext == "mp4"))
            .collect();

        if entries.len() != 50 {
            return;
        }

        let max_procs = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let max_procs_clone = max_procs.clone();
        let stop_monitoring = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let stop_clone = stop_monitoring.clone();

        let monitor_handle = tokio::spawn(async move {
            while !stop_clone.load(std::sync::atomic::Ordering::Relaxed) {
                if let Ok(out) = std::process::Command::new("pgrep").arg("-x").arg("exiftool").output() {
                    if out.status.success() {
                        let lines = String::from_utf8_lossy(&out.stdout)
                            .lines()
                            .filter(|l| !l.trim().is_empty())
                            .count();
                        max_procs_clone.fetch_max(lines, std::sync::atomic::Ordering::Relaxed);
                    }
                }
                tokio::time::sleep(std::time::Duration::from_millis(15)).await;
            }
        });

        let mut handles = Vec::new();
        for path in &entries {
            let p = path.to_string_lossy().to_string();
            handles.push(tokio::spawn(async move {
                crate::services::exiftool::read_exif_metadata_async(&p).await
            }));
        }

        for h in handles {
            let _ = h.await;
        }

        stop_monitoring.store(true, std::sync::atomic::Ordering::Relaxed);
        let _ = monitor_handle.await;

        let peak_procs = max_procs.load(std::sync::atomic::Ordering::Relaxed);
        println!("\n=== EXIF Concurrency Monitor Results ===");
        println!("Peak concurrent exiftool processes observed: {}", peak_procs);

        let final_procs = if let Ok(out) = std::process::Command::new("pgrep").arg("-x").arg("exiftool").output() {
            String::from_utf8_lossy(&out.stdout).lines().filter(|l| !l.trim().is_empty()).count()
        } else {
            0
        };
        println!("Final exiftool processes remaining: {}", final_procs);

        assert!(peak_procs <= 4, "Observed {} exiftool processes, expected <= 4", peak_procs);
        assert_eq!(final_procs, 0, "No exiftool processes should remain running");
    }
}


