/**
 * Rust IPC wrappers (display path — return asset:// URLs).
 *
 * All wrappers share the module-level LRU cache; the heavy lifting (FFmpeg
 * decode + on-disk caching) happens on the Rust side.
 */

import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { readFile } from '@tauri-apps/plugin-fs';

import type { GeneratedPreviewResult, GeneratedThumbnailResult } from './types';
import { BATCH_CONFIG, PREVIEW_CONFIG, getCacheKey } from './config';
import { thumbnailCache } from './lruCache';

/**
 * Read a cached thumbnail JPEG from disk and encode it as a data-URL.
 *
 * Small thumbnails (120–600 px JPEG, typically 5–30 KB) are cheap to keep in
 * the JS heap. Loading them via the fs plugin (IPC) bypasses the `asset://`
 * custom protocol entirely, so display works regardless of WebKit
 * same-origin checks (`Unsafe attempt to load URL asset://...`), CSP, or
 * asset-scope globs. This is the preferred path for thumbnails.
 */
export async function cachePathToDataUrl(cachePath: string): Promise<string | null> {
  try {
    const data = await readFile(cachePath);
    const blob = new Blob([data as unknown as BlobPart], { type: 'image/jpeg' });
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`cachePathToDataUrl failed for ${cachePath}:`, error);
    return null;
  }
}

/**
 * Async resolver that prefers data-URLs (via fs `readFile`) over `asset://`.
 *
 * Thumbnails are tiny (a few KB), so materialising them as data-URLs is
 * cheap and immune to asset-protocol scope/CSP/WebKit origin issues. Falls
 * back to `convertFileSrc` only when the disk read fails (e.g. fs scope
 * denial), and to inline base64 when the Rust side could not write to disk.
 */
export async function resolveImageUrlAsync(
  base64: string | null | undefined,
  cachePath: string | null | undefined,
  mimePrefix = 'data:image/jpeg;base64,',
): Promise<string | null> {
  if (cachePath) {
    const dataUrl = await cachePathToDataUrl(cachePath);
    if (dataUrl) return dataUrl;
    // Fallback: asset:// still works in production builds with correct scope.
    try {
      return convertFileSrc(cachePath);
    } catch {
      // fall through to base64
    }
  }
  if (base64) {
    return `${mimePrefix}${base64}`;
  }
  return null;
}

export async function generateVideoThumbnailRust(filePath: string, size: number = BATCH_CONFIG.MAX_THUMBNAIL_SIZE, signal?: AbortSignal): Promise<string | null> {
  if (signal?.aborted) return null;

  const cacheKey = `video_${filePath}_${size}`;
  if (thumbnailCache.has(cacheKey)) return thumbnailCache.get(cacheKey) ?? null;

  try {
    if (signal?.aborted) return null;

    const result = await invoke<GeneratedThumbnailResult>('generate_video_thumbnail_command', {
      filePath,
      size
    });

    if (signal?.aborted) return null;

    // Prefer a data-URL read from disk (works on every origin, including the
    // http:// dev server where asset:// is blocked by WebKit). Falls back to
    // asset:// / inline base64 only when the fs read fails.
    const thumbnail = await resolveImageUrlAsync(result.thumbnail_base64, result.cache_path);
    thumbnailCache.set(cacheKey, thumbnail);
    return thumbnail;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return null;
    console.warn('Video thumbnail generation failed:', error);
    thumbnailCache.set(cacheKey, null);
    return null;
  }
}

export async function generateVideoPreviewRust(filePath: string, size: number = PREVIEW_CONFIG.MAX_SIZE, signal?: AbortSignal): Promise<string | null> {
  if (signal?.aborted) return null;

  const cacheKey = `video_preview_${filePath}_${size}`;
  if (thumbnailCache.has(cacheKey)) return thumbnailCache.get(cacheKey) ?? null;

  try {
    if (signal?.aborted) return null;

    const result = await invoke<GeneratedPreviewResult>('generate_video_preview_command', {
      filePath,
      size
    });

    if (signal?.aborted) return null;

    const preview = await resolveImageUrlAsync(result.preview_base64, result.cache_path);
    thumbnailCache.set(cacheKey, preview);
    return preview;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return null;
    console.warn('Video preview generation failed:', error);
    thumbnailCache.set(cacheKey, null);
    return null;
  }
}

export async function generateThumbnailRust(filePath: string, size: number = 150): Promise<string | null> {
  const cacheKey = getCacheKey(filePath, size);
  if (thumbnailCache.has(cacheKey)) return thumbnailCache.get(cacheKey) ?? null;

  try {
    const result = await invoke<GeneratedThumbnailResult>('generate_thumbnail_command', {
      filePath,
      size
    });

    const thumbnail = await resolveImageUrlAsync(result.thumbnail_base64, result.cache_path);
    thumbnailCache.set(cacheKey, thumbnail);
    return thumbnail;
  } catch (error) {
    console.warn('Thumbnail generation failed:', error);
    thumbnailCache.set(cacheKey, null);
    return null;
  }
}
