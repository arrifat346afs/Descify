use crate::models::metadata::{EmbedMetadataRequest, EmbedMetadataResult, ExifData};
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::process::Command;

/// Get the path to the bundled exiftool binary
pub fn get_exiftool_path() -> PathBuf {
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

/// Build exiftool command with metadata arguments
pub fn build_exiftool_command(exiftool_path: &PathBuf, request: &EmbedMetadataRequest) -> Command {
    let mut cmd = Command::new(exiftool_path);

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

    // Set the output file (overwrite the original file)
    cmd.arg("-overwrite_original");

    // Add the file path as the last argument
    cmd.arg(&request.file_path);

    cmd
}

/// Execute exiftool command and return result
pub fn execute_exiftool(
    mut cmd: Command,
    request: &EmbedMetadataRequest,
    exiftool_path: &PathBuf,
) -> Result<EmbedMetadataResult, String> {
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
                    file_path: request.file_path.clone(),
                })
            } else {
                Ok(EmbedMetadataResult {
                    success: false,
                    message: format!(
                        "Failed to embed metadata. Exit code: {}. Stderr: {}",
                        output.status.code().unwrap_or(-1),
                        stderr
                    ),
                    file_path: request.file_path.clone(),
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
                file_path: request.file_path.clone(),
            })
        }
    }
}

/// Validate file before processing
pub fn validate_file(file_path: &str) -> Option<EmbedMetadataResult> {
    let path = Path::new(file_path);

    // Check if file exists
    if !path.exists() {
        return Some(EmbedMetadataResult {
            success: false,
            message: format!("File does not exist: {}", file_path),
            file_path: file_path.to_string(),
        });
    }

    // Check if file is writable
    if !path.is_file() {
        return Some(EmbedMetadataResult {
            success: false,
            message: format!("Path is not a file: {}", file_path),
            file_path: file_path.to_string(),
        });
    }

    None
}

/// Check if any metadata was provided
pub fn has_metadata(request: &EmbedMetadataRequest) -> bool {
    request.title.is_some() || request.description.is_some() || request.keywords.is_some()
}

/// Read EXIF metadata from an image/video file using exiftool
pub fn read_exif_metadata(file_path: &str) -> Result<ExifData, String> {
    // Validate file exists
    let path = Path::new(file_path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }
    if !path.is_file() {
        return Err(format!("Path is not a file: {}", file_path));
    }

    // Get the exiftool path
    let exiftool_path = get_exiftool_path();

    // Build command to read ALL metadata as JSON
    // We read all metadata first, then filter in code
    let mut cmd = Command::new(&exiftool_path);
    cmd.arg("-json");
    cmd.arg("-n"); // No conversion (show raw values)
    cmd.arg(file_path);

    // Execute command
    match cmd.output() {
        Ok(output) => {
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("ExifTool failed: {}", stderr));
            }

            let stdout = String::from_utf8_lossy(&output.stdout);

            // Debug: log the full JSON output
            eprintln!("[DEBUG] ExifTool JSON output for {}: {}", file_path, stdout);

            // Parse JSON output
            let json_data: Value = match serde_json::from_str(&stdout) {
                Ok(data) => data,
                Err(e) => return Err(format!("Failed to parse ExifTool output: {}", e)),
            };

            // Extract first item from the array
            let metadata = match json_data.as_array().and_then(|arr| arr.first()) {
                Some(item) => item,
                None => {
                    return Ok(ExifData {
                        file_path: file_path.to_string(),
                        title: None,
                        description: None,
                        keywords: None,
                    })
                }
            };

            // Extract title from various possible fields (checking multiple naming conventions)
            let title = metadata
                // XMP fields
                .get("XMP:Title")
                .or_else(|| metadata.get("Title"))
                // IPTC fields
                .or_else(|| metadata.get("IPTC:ObjectName"))
                .or_else(|| metadata.get("ObjectName"))
                // EXIF fields
                .or_else(|| metadata.get("EXIF:ImageDescription"))
                .or_else(|| metadata.get("ImageDescription"))
                // Other common fields
                .or_else(|| metadata.get("PNG:Title"))
                .or_else(|| metadata.get("MWG:Title"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            // Extract description from various possible fields
            let description = metadata
                // XMP fields
                .get("XMP:Description")
                .or_else(|| metadata.get("Description"))
                // IPTC fields
                .or_else(|| metadata.get("IPTC:Caption-Abstract"))
                .or_else(|| metadata.get("Caption-Abstract"))
                .or_else(|| metadata.get("CaptionAbstract"))
                // EXIF fields
                .or_else(|| metadata.get("EXIF:ImageDescription"))
                .or_else(|| metadata.get("ImageDescription"))
                // Other common fields
                .or_else(|| metadata.get("PNG:Description"))
                .or_else(|| metadata.get("MWG:Description"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            // Extract keywords from various possible fields
            let keywords = metadata
                // XMP fields
                .get("XMP:Subject")
                .or_else(|| metadata.get("Subject"))
                // IPTC fields
                .or_else(|| metadata.get("IPTC:Keywords"))
                .or_else(|| metadata.get("Keywords"))
                // DC fields
                .or_else(|| metadata.get("XMP-dc:Subject"))
                .or_else(|| metadata.get("dc:Subject"))
                .and_then(|v| {
                    if let Some(arr) = v.as_array() {
                        // If it's an array, join with commas
                        let kw_list: Vec<String> = arr
                            .iter()
                            .filter_map(|item| item.as_str())
                            .map(|s| s.to_string())
                            .collect();
                        if !kw_list.is_empty() {
                            return Some(kw_list.join(", "));
                        }
                    } else if let Some(s) = v.as_str() {
                        // If it's a string, use it directly
                        return Some(s.to_string());
                    }
                    None
                });

            // Debug: log what we found
            eprintln!(
                "[DEBUG] Parsed metadata - Title: {:?}, Description: {:?}, Keywords: {:?}",
                title, description, keywords
            );

            Ok(ExifData {
                file_path: file_path.to_string(),
                title,
                description,
                keywords,
            })
        }
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                Err(format!(
                    "ExifTool not found. Tried path: {:?}",
                    exiftool_path
                ))
            } else {
                Err(format!("Failed to execute ExifTool: {}", e))
            }
        }
    }
}
