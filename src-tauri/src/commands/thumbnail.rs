use crate::services::thumbnail::{
    generate_preview, generate_thumbnail, PreviewResult, ThumbnailResult,
};
use std::collections::HashMap;
use tauri::command;

const DEFAULT_THUMBNAIL_SIZE: u32 = 720;
const DEFAULT_PREVIEW_SIZE: u32 = 1920;

#[command]
pub async fn get_native_thumbnail_command(file_path: String) -> ThumbnailResult {
    let path = file_path.clone();
    tokio::task::spawn_blocking(move || generate_thumbnail(&path, DEFAULT_THUMBNAIL_SIZE))
        .await
        .unwrap_or_else(|_| ThumbnailResult {
            thumbnail_base64: None,
            width: None,
            height: None,
            file_size: None,
            from_cache: false,
        })
}

#[command]
pub async fn get_native_thumbnails_batch(file_paths: Vec<String>) -> HashMap<String, ThumbnailResult> {
    let paths = file_paths.clone();
    tokio::task::spawn_blocking(move || {
        paths
            .into_iter()
            .map(|file_path| {
                let result = generate_thumbnail(&file_path, DEFAULT_THUMBNAIL_SIZE);
                (file_path, result)
            })
            .collect()
    })
    .await
    .unwrap_or_default()
}

#[command]
pub async fn generate_thumbnail_command(file_path: String, size: Option<u32>) -> ThumbnailResult {
    let target_size = size.unwrap_or(DEFAULT_THUMBNAIL_SIZE);
    let path = file_path.clone();
    tokio::task::spawn_blocking(move || generate_thumbnail(&path, target_size))
        .await
        .unwrap_or_else(|_| ThumbnailResult {
            thumbnail_base64: None,
            width: None,
            height: None,
            file_size: None,
            from_cache: false,
        })
}

#[command]
pub async fn generate_thumbnails_batch_command(
    file_paths: Vec<String>,
    size: Option<u32>,
) -> HashMap<String, ThumbnailResult> {
    let target_size = size.unwrap_or(DEFAULT_THUMBNAIL_SIZE);
    let paths = file_paths.clone();
    tokio::task::spawn_blocking(move || {
        paths
            .into_iter()
            .map(|file_path| {
                let result = generate_thumbnail(&file_path, target_size);
                (file_path, result)
            })
            .collect()
    })
    .await
    .unwrap_or_default()
}

#[command]
pub async fn generate_preview_command(file_path: String, size: Option<u32>) -> PreviewResult {
    let target_size = size.unwrap_or(DEFAULT_PREVIEW_SIZE);
    let path = file_path.clone();
    tokio::task::spawn_blocking(move || generate_preview(&path, target_size))
        .await
        .unwrap_or_else(|_| PreviewResult {
            preview_base64: None,
            width: None,
            height: None,
            from_cache: false,
        })
}
