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
