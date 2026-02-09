import { invoke } from '@tauri-apps/api/core';

export interface EmbedMetadataRequest {
  file_path: string;
  title?: string;
  description?: string;
  keywords?: string;
}

export interface EmbedMetadataResult {
  success: boolean;
  message: string;
  file_path: string;
}

/**
 * Embed metadata into image/video files using exiftool
 */
export async function embedMetadata(request: EmbedMetadataRequest): Promise<EmbedMetadataResult> {
  return await invoke('embed_metadata', { request });
}

// Interface for EXIF metadata response
export interface ExifData {
  file_path: string;
  title?: string;
  description?: string;
  keywords?: string;
}

/**
 * Read EXIF metadata from an image/video file using exiftool
 */
export async function readExifMetadata(filePath: string): Promise<ExifData> {
  return await invoke('read_exif_metadata_command', { filePath });
}
