use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct CacheDirectory {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub os_type: String,
}

fn format_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

fn get_dir_size(path: &PathBuf) -> u64 {
    let mut size: u64 = 0;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    size += meta.len();
                } else if meta.is_dir() {
                    size += get_dir_size(&entry.path());
                }
            }
        }
    }
    size
}

fn get_app_cache_path() -> Option<PathBuf> {
    // Must match services::thumbnail::get_app_thumbnail_cache_dir() so the
    // cache-info/clear UI and the thumbnail writer agree on every OS.
    // On Windows `dirs::cache_dir()` is %LOCALAPPDATA% (no app name),
    // so the full path is %LOCALAPPDATA%\descify\thumbnails.
    dirs::cache_dir().map(|d| d.join("descify").join("thumbnails"))
}

#[tauri::command]
pub fn get_cache_info() -> Result<Vec<CacheDirectory>, String> {
    let mut caches: Vec<CacheDirectory> = Vec::new();

    if let Some(cache_path) = get_app_cache_path() {
        let os_type = if cfg!(target_os = "windows") {
            "windows"
        } else if cfg!(target_os = "macos") {
            "macos"
        } else {
            "linux"
        };

        let size = if cache_path.exists() {
            get_dir_size(&cache_path)
        } else {
            0
        };

        caches.push(CacheDirectory {
            name: "Descify Thumbnails".to_string(),
            path: cache_path.to_string_lossy().to_string(),
            size_bytes: size,
            os_type: os_type.to_string(),
        });
    }

    Ok(caches)
}

#[tauri::command]
pub fn clear_cache_directory(path: String) -> Result<String, String> {
    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        return Err("Directory does not exist".to_string());
    }

    if !path_buf.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // The command is reachable from the webview, so never delete
    // anything outside the app's own cache directory.
    let app_cache = get_app_cache_path()
        .ok_or_else(|| "Cannot resolve the app cache directory".to_string())?;
    if !path_buf.starts_with(&app_cache) {
        return Err("Path is outside the Descify cache directory".to_string());
    }

    let mut cleared_size: u64 = 0;

    if let Ok(entries) = fs::read_dir(&path_buf) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                let entry_size = if meta.is_file() {
                    meta.len()
                } else if meta.is_dir() {
                    get_dir_size(&entry.path())
                } else {
                    0
                };

                let entry_path = entry.path();
                if entry_path.is_dir() {
                    let _ = fs::remove_dir_all(entry_path);
                } else {
                    let _ = fs::remove_file(entry_path);
                }
                cleared_size += entry_size;
            }
        }
    }

    Ok(format!("Cleared {}", format_size(cleared_size)))
}
