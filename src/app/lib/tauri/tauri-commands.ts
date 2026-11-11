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

export interface CacheDirectory {
  name: string;
  path: string;
  size_bytes: number;
  os_type: string;
}

export async function getCacheInfo(): Promise<CacheDirectory[]> {
  return await invoke('get_cache_info');
}

export async function clearCacheDirectory(path: string): Promise<string> {
  return await invoke('clear_cache_directory', { path });
}

/** Persists an API key in the OS keychain. */
export async function storeApiKey(provider: string, key: string): Promise<void> {
  return await invoke('store_api_key', { provider, key });
}

/** Reads an API key from the OS keychain (null when unset). */
export async function readApiKey(provider: string): Promise<string | null> {
  return await invoke<string | null>('read_api_key', { provider });
}

export interface CodexStatus {
  connected: boolean;
  email?: string;
  plan_usage_enabled: boolean;
  expires_at?: number;
}

export async function codexSignIn(): Promise<CodexStatus> {
  return await invoke<CodexStatus>('codex_sign_in');
}

export async function codexStatus(): Promise<CodexStatus> {
  return await invoke<CodexStatus>('codex_status');
}

export async function codexLogout(): Promise<void> {
  return await invoke('codex_logout');
}

export async function codexModels(): Promise<Array<{ slug: string; display_name: string }>> {
  return await invoke<Array<{ slug: string; display_name: string }>>('codex_models');
}

export async function codexGenerate(request: { model: string; prompt: string; image_data_url: string }): Promise<string> {
  return await invoke<string>('codex_generate', { request });
}
