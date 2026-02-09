// Data structures for metadata operations
use serde::{Deserialize, Serialize};

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

// Data structure for reading EXIF metadata
#[derive(Debug, Serialize, Deserialize)]
pub struct ExifData {
    pub file_path: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub keywords: Option<String>,
}
