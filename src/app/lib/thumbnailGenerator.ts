/**
 * Background Thumbnail Generator
 * Non-blocking thumbnail generation that doesn't affect UI
 *
 * Browser-based approach (like bulk_image_processor_v3.html demo)
 * - Uses createImageBitmap + Canvas for efficient client-side resizing
 * - 6 concurrent workers for fast processing
 * - Non-blocking with thumbnails appearing as they finish
 * - Memory efficient with LRU cache for repeated lookups
 */

import { invoke, convertFileSrc } from '@tauri-apps/api/core';

// ---------------------------------------------------------------------------
// Browser-based thumbnail generation (concurrent, non-blocking)
// ---------------------------------------------------------------------------

// Draw the (already-resized) bitmap onto a small canvas and encode to WebP.
// The bitmap arrives pre-scaled via createImageBitmap resizeWidth/resizeHeight
// hints, so the canvas is tiny (e.g. 120×80 px) and this step is very cheap.
// Note: OffscreenCanvas cannot produce a synchronous data-URL (only async
// convertToBlob), so we use the regular HTMLCanvasElement here.
function resizeViaCanvas(bitmap: ImageBitmap, _maxDim: number, quality: number): string {
  const w = bitmap.width;
  const h = bitmap.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  (canvas.getContext('2d') as CanvasRenderingContext2D).drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL('image/webp', quality);
}

// ---------------------------------------------------------------------------
// Bounded LRU cache
// ---------------------------------------------------------------------------

/**
 * Simple LRU cache backed by a plain `Map` (which preserves insertion order).
 * On every `get` the entry is moved to the end (most-recently-used position).
 * When `capacity` is reached the oldest entry (front of the Map) is evicted.
 */
class LRUCache<K, V> {
  private readonly capacity: number;
  private readonly map: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.map = new Map();
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    // Refresh: delete-then-reinsert marks the entry as most-recently used.
    const value = this.map.get(key) as V;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.capacity) {
      // Evict the oldest entry (first key in insertion order).
      const firstKey = this.map.keys().next().value as K;
      this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  delete(key: K): void {
    this.map.delete(key);
  }

  get size(): number {
    return this.map.size;
  }
}

// ---------------------------------------------------------------------------
// IPC result shapes (must mirror src-tauri/src/services/thumbnail.rs)
// ---------------------------------------------------------------------------

interface GeneratedThumbnailResult {
  /** Populated only when the thumbnail could not be saved to disk. Prefer cache_path. */
  thumbnail_base64: string | null;
  /** Absolute path to the JPEG inside the app's on-disk thumbnail cache. */
  cache_path: string | null;
  width: number | null;
  height: number | null;
  file_size: string | null;
  from_cache: boolean;
}

interface GeneratedPreviewResult {
  /** Populated only when the preview could not be saved to disk. Prefer cache_path. */
  preview_base64: string | null;
  /** Absolute path to the JPEG inside the app's on-disk thumbnail cache. */
  cache_path: string | null;
  width: number | null;
  height: number | null;
  from_cache: boolean;
}

// ---------------------------------------------------------------------------
// Module-level LRU cache (replaces the unbounded Map)
// ---------------------------------------------------------------------------

/**
 * Stores `asset://` URLs (or null for failures).  Values are short strings
 * (~80 bytes each) so even the full 2 000-entry cap uses < 200 KB.
 * Canvas-generated fallback data-URLs are also stored here; they are larger
 * but the LRU eviction keeps total size bounded.
 */
const THUMBNAIL_CACHE_CAPACITY = 2000;
const thumbnailCache = new LRUCache<string, string | null>(THUMBNAIL_CACHE_CAPACITY);

export const BATCH_CONFIG = {
  // Raised from 6 → 12: createImageBitmap is mostly I/O + GPU decode so more
  // concurrent tasks keep the pipeline saturated without starving the main thread.
  CONCURRENCY: 12,
  MAX_THUMBNAIL_SIZE: 120,
  JPEG_QUALITY: 0.82,
};

const AI_IMAGE_CONFIG = {
  MAX_SIZE: 480,
  JPEG_QUALITY: 0.6,
};

const PREVIEW_CONFIG = {
  MAX_SIZE: 600,
  JPEG_QUALITY: 0.8,
};

function getCacheKey(filePath: string, size: number): string {
  return `${filePath}_${size}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a Rust IPC result to a displayable URL.
 *
 * Priority:
 *  1. `cache_path`  → convert to an `asset://` URL via `convertFileSrc`.
 *     WebKit loads the file directly from disk; the image data never enters
 *     the JS heap.
 *  2. `base64`      → construct a data-URL as a last resort (disk write
 *     failed on the Rust side).
 *  3. `null`        → generation failed entirely.
 */
function resolveImageUrl(
  base64: string | null | undefined,
  cachePath: string | null | undefined,
  mimePrefix = 'data:image/jpeg;base64,',
): string | null {
  if (cachePath) {
    return convertFileSrc(cachePath);
  }
  if (base64) {
    return `${mimePrefix}${base64}`;
  }
  return null;
}

/**
 * Convert any URL (asset:// or data:) to a base64 data-URL suitable for
 * sending to a remote AI vision API.  This is the *only* place where image
 * data is materialised as a large JS string, and it is done transiently —
 * the result is used immediately and not stored in any cache.
 */
async function assetUrlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ---------------------------------------------------------------------------
// Rust IPC wrappers (display path — return asset:// URLs)
// ---------------------------------------------------------------------------

async function generateVideoThumbnailRust(filePath: string, size: number = BATCH_CONFIG.MAX_THUMBNAIL_SIZE, signal?: AbortSignal): Promise<string | null> {
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

    // Prefer the on-disk path; fall back to base64 only if the Rust side
    // could not persist the thumbnail (disk error).
    const thumbnail = resolveImageUrl(result.thumbnail_base64, result.cache_path);
    thumbnailCache.set(cacheKey, thumbnail);
    return thumbnail;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return null;
    console.warn('Video thumbnail generation failed:', error);
    thumbnailCache.set(cacheKey, null);
    return null;
  }
}

async function generateVideoPreviewRust(filePath: string, size: number = PREVIEW_CONFIG.MAX_SIZE, signal?: AbortSignal): Promise<string | null> {
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

    const preview = resolveImageUrl(result.preview_base64, result.cache_path);
    thumbnailCache.set(cacheKey, preview);
    return preview;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return null;
    console.warn('Video preview generation failed:', error);
    thumbnailCache.set(cacheKey, null);
    return null;
  }
}

async function generateThumbnailRust(filePath: string, size: number = 150): Promise<string | null> {
  const cacheKey = getCacheKey(filePath, size);
  if (thumbnailCache.has(cacheKey)) return thumbnailCache.get(cacheKey) ?? null;

  try {
    const result = await invoke<GeneratedThumbnailResult>('generate_thumbnail_command', {
      filePath,
      size
    });

    const thumbnail = resolveImageUrl(result.thumbnail_base64, result.cache_path);
    thumbnailCache.set(cacheKey, thumbnail);
    return thumbnail;
  } catch (error) {
    console.warn('Thumbnail generation failed:', error);
    thumbnailCache.set(cacheKey, null);
    return null;
  }
}

async function generateImageViaCanvas(file: File, maxSize: number, quality: number): Promise<string> {
  if (file.type === 'image/svg+xml') {
    return generateImageFallback(file, maxSize, quality);
  }

  try {
    const bitmap = await createImageBitmap(file, {
      resizeWidth: maxSize,
      resizeHeight: maxSize,
      resizeQuality: 'medium',
    });

    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });

    if (!ctx) {
      bitmap.close();
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return generateImageFallback(file, maxSize, quality);
  }
}

function generateImageFallback(file: File, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      img.src = '';
      reject(new Error(`Timeout: ${file.name}`));
    }, 10000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        URL.revokeObjectURL(objectUrl);
        img.src = '';
        resolve(dataUrl);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        img.src = '';
        reject(error);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      img.src = '';
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * Generate an image for AI vision API consumption.
 *
 * The result is always a base64 `data:image/jpeg;base64,...` string because
 * remote AI providers (OpenAI, Google Gemini, OpenRouter) require inline
 * image data.  For display purposes you should use `generateImageThumbnail` /
 * `generatePreviewImage` instead — those return lighter `asset://` URLs.
 *
 * We obtain the thumbnail via the same Rust/LRU path (avoiding redundant
 * FFmpeg invocations) and then materialise the base64 data transiently via
 * `assetUrlToDataUrl`.  The large string is NOT stored in any cache.
 */
export async function generateAIImage(file: File, filePath?: string): Promise<string> {
  if (file.type.startsWith('video/') && filePath) {
    const videoThumb = await generateVideoThumbnailRust(filePath, AI_IMAGE_CONFIG.MAX_SIZE);
    if (videoThumb) {
      // The thumbnail is an asset:// URL — convert to base64 for the AI API.
      // This is transient: the result is used immediately and not cached.
      return assetUrlToDataUrl(videoThumb);
    }
    return generateVideoThumbnail(file);
  }
  // Canvas path already returns a data-URL.
  return generateImageViaCanvas(file, AI_IMAGE_CONFIG.MAX_SIZE, AI_IMAGE_CONFIG.JPEG_QUALITY);
}

export async function generatePreviewImage(file: File, filePath?: string, signal?: AbortSignal): Promise<string> {
  if (signal?.aborted) {
    throw new Error('Aborted');
  }
  
  if (filePath) {
    if (file.type.startsWith('video/')) {
      const preview = await generateVideoPreviewRust(filePath, PREVIEW_CONFIG.MAX_SIZE, signal);
      if (preview) return preview;
    } else {
      try {
        if (signal?.aborted) {
          throw new Error('Aborted');
        }
        
        const cacheKey = `preview_${filePath}_${PREVIEW_CONFIG.MAX_SIZE}`;
        if (thumbnailCache.has(cacheKey)) {
          return thumbnailCache.get(cacheKey) ?? '';
        }
        
        const result = await invoke<GeneratedPreviewResult>('generate_preview_command', {
          filePath,
          size: PREVIEW_CONFIG.MAX_SIZE
        });

        if (signal?.aborted) {
          throw new Error('Aborted');
        }

        const preview = resolveImageUrl(result.preview_base64, result.cache_path);
        if (preview) {
          thumbnailCache.set(cacheKey, preview);
          return preview;
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }
        console.warn('Preview generation failed:', error);
      }
    }
  }

  if (signal?.aborted) {
    throw new Error('Aborted');
  }
  
  if (file.type.startsWith('video/')) {
    return generateVideoThumbnail(file);
  }

  return generateImageViaCanvas(file, PREVIEW_CONFIG.MAX_SIZE, PREVIEW_CONFIG.JPEG_QUALITY);
}

export function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.autoplay = false;
    video.playsInline = true;
    const objectUrl = URL.createObjectURL(file);

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      video.src = '';
      reject(new Error(`Timeout: ${file.name}`));
    }, 4000);

    video.onloadeddata = () => {
      video.currentTime = 0;
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const maxSize = BATCH_CONFIG.MAX_THUMBNAIL_SIZE;
        let width = video.videoWidth;
        let height = video.videoHeight;
        const scale = Math.min(maxSize / width, maxSize / height, 1);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          video.src = '';
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(video, 0, 0, width, height);
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.5);

        URL.revokeObjectURL(objectUrl);
        video.src = '';
        resolve(thumbnailUrl);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        video.src = '';
        reject(error);
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      video.src = '';
      reject(new Error('Failed to load video'));
    };

    video.src = objectUrl;
  });
}

export async function generateImageThumbnail(file: File, _filePath?: string): Promise<string> {
  // Fast path: pass the File (which IS a Blob) directly to createImageBitmap.
  // Using resizeWidth/resizeHeight hints lets the browser decode at the target
  // size — far cheaper than decoding full-resolution then scaling in JS.
  // This matches exactly what the bulk_image_processor HTML demo does.
  try {
    const size = BATCH_CONFIG.MAX_THUMBNAIL_SIZE;
    const bitmap = await createImageBitmap(file, {
      resizeWidth: size,
      resizeHeight: size,
      resizeQuality: 'pixelated', // fastest decode hint; quality is fine at 120 px
    });
    const thumbnail = resizeViaCanvas(bitmap, size, BATCH_CONFIG.JPEG_QUALITY);
    bitmap.close();
    return thumbnail;
  } catch (error) {
    console.warn(`Browser thumbnail failed for ${file.name}, falling back to Image+Canvas:`, error);
    return generateImageViaCanvas(file, BATCH_CONFIG.MAX_THUMBNAIL_SIZE, BATCH_CONFIG.JPEG_QUALITY);
  }
}

export async function generateThumbnailsBatch(
  files: File[],
  onProgress: (completed: number, total: number, fileName: string) => void = () => {},
  onThumbnailReady: (file: File, thumbnailUrl: string) => void = () => {},
  _concurrency: number = BATCH_CONFIG.CONCURRENCY,
  filePaths?: Map<File, string>
): Promise<Map<File, string>> {
  const results = new Map<File, string>();
  const total = files.length;
  let completed = 0;

  const CONCURRENCY = BATCH_CONFIG.CONCURRENCY;

  console.log(`📦 Starting thumbnail generation: ${files.length} files, concurrency=${CONCURRENCY}`);

  // Promise-based pool: no setInterval polling.
  // Each "slot" is a looping worker that pulls from the shared index until done.
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const idx = nextIndex++;
      if (idx >= files.length) break;

      const file = files[idx];
      const filePath = filePaths?.get(file);

      try {
        let thumbnail: string | null = null;

        if (file.type.startsWith('image/')) {
          thumbnail = await generateImageThumbnail(file, filePath);
        } else if (file.type.startsWith('video/')) {
          if (filePath) {
            try {
              thumbnail = await generateVideoThumbnailRust(filePath);
            } catch {
              thumbnail = await generateVideoThumbnail(file);
            }
          } else {
            thumbnail = await generateVideoThumbnail(file);
          }
        }

        if (thumbnail) {
          results.set(file, thumbnail);
          onThumbnailReady(file, thumbnail);
        }
      } catch (error) {
        console.error(`Failed thumbnail for ${file.name}:`, error);
      }

      completed++;
      onProgress(completed, total, file.name);
    }
  };

  // Spin up CONCURRENCY workers and await all of them.
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));

  console.log(`✅ Completed ${results.size}/${total} thumbnails`);
  return results;
}

export function getCachedThumbnail(filePath: string, size: number = BATCH_CONFIG.MAX_THUMBNAIL_SIZE): string | null {
  const cacheKey = getCacheKey(filePath, size);
  return thumbnailCache.get(cacheKey) ?? null;
}

export function hasCachedThumbnail(filePath: string, size: number = BATCH_CONFIG.MAX_THUMBNAIL_SIZE): boolean {
  const cacheKey = getCacheKey(filePath, size);
  const cached = thumbnailCache.get(cacheKey);
  return cached !== undefined && cached !== null;
}

export function preloadThumbnails(filePaths: string[]): void {
  for (const filePath of filePaths) {
    const cacheKey = getCacheKey(filePath, BATCH_CONFIG.MAX_THUMBNAIL_SIZE);
    if (!thumbnailCache.has(cacheKey)) {
      generateThumbnailRust(filePath, BATCH_CONFIG.MAX_THUMBNAIL_SIZE);
    }
  }
}
