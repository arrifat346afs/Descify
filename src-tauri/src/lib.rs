// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use ruurd_photos_thumbnail_generation::{generate_thumbnails, ThumbOptions, VideoOutputFormat, VideoThumbOptions, AvifOptions};
use std::path::{Path, PathBuf};
use std::io::Write;
use uuid::Uuid;
use base64::engine::general_purpose;
use base64::Engine as _;


#[tauri::command]
async fn make_thumbnail(file_path: String) -> Result<String, String> {
    // If frontend passed a data URL (data:<mime>;base64,<data>), decode it to a temp file
    let mut temp_source: Option<PathBuf> = None;
    let source_path: PathBuf = if file_path.starts_with("data:") {
        // parse data URL
        match file_path.find(',') {
            Some(comma_idx) => {
                let meta = &file_path[5..comma_idx]; // after "data:"
                let data = &file_path[comma_idx + 1..];
                // meta looks like "image/png;base64" or "video/mp4;base64"
                let mime_part = meta.split(';').next().unwrap_or("application/octet-stream");
                let ext = mime_part.split('/').nth(1).unwrap_or("bin");

                let bytes = match general_purpose::STANDARD.decode(data) {
                    Ok(b) => b,
                    Err(e) => return Err(format!("Failed to decode base64 data URL: {}", e)),
                };

                let mut tmp = std::env::temp_dir();
                tmp.push(format!("upload-{}.{}", Uuid::new_v4(), ext));
                match std::fs::File::create(&tmp) {
                    Ok(mut f) => {
                        if let Err(e) = f.write_all(&bytes) {
                            return Err(format!("Failed to write temp file: {}", e));
                        }
                    }
                    Err(e) => return Err(format!("Failed to create temp file: {}", e)),
                }

                temp_source = Some(tmp.clone());
                tmp
            }
            _none => return Err("Invalid data URL format".into()),
        }
    } else {
        PathBuf::from(&file_path)
    };
    let output_dir = Path::new("thumbnails");

    let config = ThumbOptions {
        photo_extensions: ["jpg", "jpeg", "png", "gif", "tiff", "tga", "avif"]
            .iter()
            .map(|x| x.to_string())
            .collect(),
        video_extensions: [
            "mp4", "webm", "av1", "3gp", "mov", "mkv", "flv", "m4v", "m4p",
        ]
        .iter()
        .map(|x| x.to_string())
        .collect(),
        skip_if_exists: true,
        heights: vec![10, 144, 240, 360, 480, 720, 1080],
        thumbnail_extension: "avif".to_string(),
        avif_options: AvifOptions {
            quality: 80.,
            alpha_quality: 80.,
            speed: 4,
        },
        video_options: VideoThumbOptions {
            extension: "webm".to_string(),
            thumb_time: 0.5,
            percentages: vec![0, 33, 66, 99],
            height: 720,
            transcode_outputs: vec![
                VideoOutputFormat {
                    height: 480,
                    quality: 35,
                },
                VideoOutputFormat {
                    height: 144,
                    quality: 40,
                },
            ],
        },
    };

    // Ensure output directory exists
    let out_dir = output_dir.join("vid_thumbs");
    if let Err(e) = std::fs::create_dir_all(&out_dir) {
        return Err(format!("Failed to create output directory {:?}: {}", out_dir, e));
    }

    // Call the async thumbnail generator
    if let Err(e) = generate_thumbnails(&source_path, &out_dir, &config).await {
        // cleanup temp file if we created one
        if let Some(tmp) = temp_source {
            let _ = std::fs::remove_file(tmp);
        }
        return Err(format!("Failed to generate thumbnails: {}", e));
    }

    // Collect generated files and return the first one found
    let mut generated_files: Vec<PathBuf> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&out_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                generated_files.push(p);
            } else if p.is_dir() {
                // scan subdir
                if let Ok(sub) = std::fs::read_dir(p) {
                    for e in sub.flatten() {
                        let sp = e.path();
                        if sp.is_file() {
                            generated_files.push(sp);
                        }
                    }
                }
            }
        }
    }

    // cleanup temp source file if created
    if let Some(tmp) = temp_source {
        let _ = std::fs::remove_file(&tmp);
    }

    if generated_files.is_empty() {
        return Err("No thumbnails were generated".into());
    }

    // return the first generated file path as string
    let first = &generated_files[0];
    Ok(first.to_string_lossy().to_string())
}



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![make_thumbnail])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
