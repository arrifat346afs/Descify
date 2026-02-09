// Tauri command handlers for metadata operations
use crate::models::metadata::{EmbedMetadataRequest, EmbedMetadataResult, ExifData};
use crate::services::exiftool::{
    build_exiftool_command, execute_exiftool, get_exiftool_path, has_metadata, read_exif_metadata, validate_file,
};

/// Embed metadata into image/video files using exiftool
#[tauri::command]
pub async fn embed_metadata(request: EmbedMetadataRequest) -> Result<EmbedMetadataResult, String> {
    // Validate file
    if let Some(error_result) = validate_file(&request.file_path) {
        return Ok(error_result);
    }

    // Check if any metadata was provided
    if !has_metadata(&request) {
        return Ok(EmbedMetadataResult {
            success: true,
            message: "No metadata provided to embed".to_string(),
            file_path: request.file_path.clone(),
        });
    }

    // Get the exiftool path (bundled or system)
    let exiftool_path = get_exiftool_path();

    // Build and execute exiftool command
    let cmd = build_exiftool_command(&exiftool_path, &request);
    execute_exiftool(cmd, &request, &exiftool_path)
}

/// Read EXIF metadata from an image/video file
#[tauri::command]
pub async fn read_exif_metadata_command(file_path: String) -> Result<ExifData, String> {
    read_exif_metadata(&file_path)
}
