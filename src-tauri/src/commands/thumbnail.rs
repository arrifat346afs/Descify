use crate::services::thumbnail::{
    generate_preview, generate_thumbnail, generate_video_preview, generate_video_thumbnail,
    PreviewResult, ThumbnailResult,
};
use tauri::command;

const DEFAULT_THUMBNAIL_SIZE: u32 = 720;
const DEFAULT_PREVIEW_SIZE: u32 = 1920;

#[command]
pub async fn generate_thumbnail_command(file_path: String, size: Option<u32>) -> ThumbnailResult {
    let target_size = size.unwrap_or(DEFAULT_THUMBNAIL_SIZE);
    let path = file_path.clone();
    tokio::task::spawn_blocking(move || generate_thumbnail(&path, target_size))
        .await
        .unwrap_or(ThumbnailResult {
            thumbnail_base64: None,
            cache_path: None,
            width: None,
            height: None,
            file_size: None,
            from_cache: false,
        })
}

#[command]
pub async fn generate_preview_command(file_path: String, size: Option<u32>) -> PreviewResult {
    let target_size = size.unwrap_or(DEFAULT_PREVIEW_SIZE);
    let path = file_path.clone();
    tokio::task::spawn_blocking(move || generate_preview(&path, target_size))
        .await
        .unwrap_or(PreviewResult {
            preview_base64: None,
            cache_path: None,
            width: None,
            height: None,
            from_cache: false,
        })
}

#[command]
pub async fn generate_video_thumbnail_command(
    file_path: String,
    size: Option<u32>,
) -> ThumbnailResult {
    let target_size = size.unwrap_or(DEFAULT_THUMBNAIL_SIZE);
    generate_video_thumbnail(&file_path, target_size).await
}

#[command]
pub async fn generate_video_preview_command(file_path: String, size: Option<u32>) -> PreviewResult {
    let target_size = size.unwrap_or(DEFAULT_PREVIEW_SIZE);
    generate_video_preview(&file_path, target_size).await
}
