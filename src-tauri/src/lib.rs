// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize)]
pub struct EmbedMetadataRequest {
    pub file_path: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub keywords: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmbedMetadataResult {
    pub success: bool,
    pub message: String,
    pub file_path: String,
}

/// Get the path to the bundled exiftool binary
fn get_exiftool_path() -> PathBuf {
    // Try to find exiftool in the following order:
    // 1. Bundled with the app (in resources)
    // 2. System PATH (fallback)

    // Get the resource directory path
    if let Ok(resource_dir) = std::env::current_exe().and_then(|exe_path| {
        exe_path
            .parent()
            .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "No parent"))
            .map(|p| p.to_path_buf())
    }) {
        // Check for platform-specific exiftool binary
        #[cfg(target_os = "windows")]
        let exiftool_name = "exiftool.exe";

        #[cfg(not(target_os = "windows"))]
        let exiftool_name = "exiftool";

        // Try in the same directory as the executable
        let bundled_path = resource_dir.join(exiftool_name);
        if bundled_path.exists() {
            return bundled_path;
        }

        // Try in a resources subdirectory
        let resources_path = resource_dir.join("resources").join(exiftool_name);
        if resources_path.exists() {
            return resources_path;
        }
    }

    // Fallback to system PATH
    PathBuf::from("exiftool")
}

/// Embed metadata into image/video files using exiftool
#[tauri::command]
async fn embed_metadata(request: EmbedMetadataRequest) -> Result<EmbedMetadataResult, String> {
    let file_path = Path::new(&request.file_path);

    // Check if file exists
    if !file_path.exists() {
        return Ok(EmbedMetadataResult {
            success: false,
            message: format!("File does not exist: {}", request.file_path),
            file_path: request.file_path,
        });
    }

    // Check if file is writable
    if !file_path.is_file() {
        return Ok(EmbedMetadataResult {
            success: false,
            message: format!("Path is not a file: {}", request.file_path),
            file_path: request.file_path,
        });
    }

    // Use std::process to run exiftool command
    use std::process::Command;

    // Get the exiftool path (bundled or system)
    let exiftool_path = get_exiftool_path();

    // Build exiftool command arguments
    let mut cmd = Command::new(&exiftool_path);

    // Add title tags if provided
    if let Some(ref title) = request.title {
        if !title.trim().is_empty() {
            cmd.arg(format!("-XMP:Title={}", title));
            cmd.arg(format!("-IPTC:ObjectName={}", title));
            cmd.arg(format!("-EXIF:ImageDescription={}", title));
        }
    }

    // Add description tags if provided
    if let Some(ref description) = request.description {
        if !description.trim().is_empty() {
            cmd.arg(format!("-XMP:Description={}", description));
            cmd.arg(format!("-EXIF:ImageDescription={}", description));
            cmd.arg(format!("-IPTC:Caption-Abstract={}", description));
        }
    }

    // Add keywords tags if provided
    if let Some(ref keywords) = request.keywords {
        if !keywords.trim().is_empty() {
            // Split keywords by comma and trim each keyword
            let keyword_list: Vec<&str> = keywords
                .split(',')
                .map(|k| k.trim())
                .filter(|k| !k.is_empty())
                .collect();

            if !keyword_list.is_empty() {
                // Add each keyword individually for XMP:Subject
                for keyword in &keyword_list {
                    cmd.arg(format!("-XMP:Subject={}", keyword));
                }

                // Add keywords as a single string for IPTC:Keywords
                cmd.arg(format!("-IPTC:Keywords={}", keywords));
            }
        }
    }

    // If no tags to write, return success
    if request.title.is_none() && request.description.is_none() && request.keywords.is_none() {
        return Ok(EmbedMetadataResult {
            success: true,
            message: "No metadata provided to embed".to_string(),
            file_path: request.file_path,
        });
    }

    // Set the output file (overwrite the original file)
    cmd.arg("-overwrite_original");

    // Add the file path as the last argument
    cmd.arg(&request.file_path);

    // Execute the command
    match cmd.output() {
        Ok(output) => {
            let _stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);

            if output.status.success() {
                Ok(EmbedMetadataResult {
                    success: true,
                    message: format!(
                        "Metadata successfully embedded{}",
                        if !stderr.is_empty() {
                            format!(" Warning: {}", stderr)
                        } else {
                            String::new()
                        }
                    ),
                    file_path: request.file_path,
                })
            } else {
                Ok(EmbedMetadataResult {
                    success: false,
                    message: format!(
                        "Failed to embed metadata. Exit code: {}. Stderr: {}",
                        output.status.code().unwrap_or(-1),
                        stderr
                    ),
                    file_path: request.file_path,
                })
            }
        }
        Err(e) => {
            let error_msg = if e.kind() == std::io::ErrorKind::NotFound {
                format!(
                    "Failed to execute exiftool: {} - ExifTool not found. Please install ExifTool or ensure it's bundled with the application. Tried path: {:?}",
                    e,
                    exiftool_path
                )
            } else {
                format!("Failed to execute exiftool: {}", e)
            };

            Ok(EmbedMetadataResult {
                success: false,
                message: error_msg,
                file_path: request.file_path,
            })
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![embed_metadata])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
