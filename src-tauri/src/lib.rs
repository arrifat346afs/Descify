// Tauri application library with modular architecture
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

// Module declarations
mod commands;
mod models;
mod services;

// Import the command function for Tauri's generate_handler macro
use commands::metadata::{embed_metadata, read_exif_metadata_command};
use commands::thumbnail::{
    generate_preview_command, generate_thumbnail_command, generate_thumbnails_batch_command,
    get_native_thumbnail_command, get_native_thumbnails_batch,
};
use commands::cache::{get_cache_info, clear_cache_directory};

// Re-export commonly used types for convenience
pub use models::metadata::{EmbedMetadataRequest, EmbedMetadataResult};

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
        .invoke_handler(tauri::generate_handler![embed_metadata, read_exif_metadata_command, get_native_thumbnail_command, get_native_thumbnails_batch, generate_thumbnail_command, generate_thumbnails_batch_command, generate_preview_command, get_cache_info, clear_cache_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
