/**
 * Background Thumbnail Generator
 * Non-blocking thumbnail generation that doesn't affect UI
 */

import { invoke } from '@tauri-apps/api/core';

interface GeneratedThumbnailResult {
  thumbnail_base64: string | null;
  width: number | null;
  height: number | null;
  file_size: string | null;
  from_cache: boolean;
}

interface GeneratedPreviewResult {
  preview_base64: string | null;
  width: number | null;
  height: number | null;
  from_cache: boolean;
}

const thumbnailCache = new Map<string, string | null>();

export const BATCH_CONFIG = {
  CONCURRENCY: 6,
  MAX_THUMBNAIL_SIZE: 150,
  JPEG_QUALITY: 0.5,
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

async function generateThumbnailRust(filePath: string, size: number = 150): Promise<string | null> {
  const cacheKey = getCacheKey(filePath, size);
  
  if (thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey) ?? null;
  }
  
  try {
    const result = await invoke<GeneratedThumbnailResult>('generate_thumbnail_command', {
      filePath,
      size
    });
    
    const thumbnail = result.thumbnail_base64 
      ? `data:image/jpeg;base64,${result.thumbnail_base64}` 
      : null;
    
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
      resizeQuality: 'high',
    });

    let drawWidth = bitmap.width;
    let drawHeight = bitmap.height;

    if (drawWidth > maxSize || drawHeight > maxSize) {
      if (drawWidth > drawHeight) {
        drawHeight = Math.round((drawHeight * maxSize) / drawWidth);
        drawWidth = maxSize;
      } else {
        drawWidth = Math.round((drawWidth * maxSize) / drawHeight);
        drawHeight = maxSize;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = drawWidth;
    canvas.height = drawHeight;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) {
      bitmap.close();
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(bitmap, 0, 0, drawWidth, drawHeight);
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

export async function generateAIImage(file: File): Promise<string> {
  return generateImageViaCanvas(file, AI_IMAGE_CONFIG.MAX_SIZE, AI_IMAGE_CONFIG.JPEG_QUALITY);
}

export async function generatePreviewImage(file: File, filePath?: string): Promise<string> {
  if (filePath) {
    try {
      const cacheKey = `preview_${filePath}_${PREVIEW_CONFIG.MAX_SIZE}`;
      if (thumbnailCache.has(cacheKey)) {
        return thumbnailCache.get(cacheKey) ?? '';
      }
      
      const result = await invoke<GeneratedPreviewResult>('generate_preview_command', {
        filePath,
        size: PREVIEW_CONFIG.MAX_SIZE
      });
      
      if (result.preview_base64) {
        const preview = `data:image/jpeg;base64,${result.preview_base64}`;
        thumbnailCache.set(cacheKey, preview);
        return preview;
      }
    } catch (error) {
      console.warn('Preview generation failed:', error);
    }
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

export async function generateImageThumbnail(file: File, filePath?: string): Promise<string> {
  if (filePath) {
    const thumbnail = await generateThumbnailRust(filePath, BATCH_CONFIG.MAX_THUMBNAIL_SIZE);
    if (thumbnail) {
      return thumbnail;
    }
  }

  return generateImageViaCanvas(file, BATCH_CONFIG.MAX_THUMBNAIL_SIZE, BATCH_CONFIG.JPEG_QUALITY);
}

export async function generateThumbnailsBatch(
  files: File[],
  onProgress: (completed: number, total: number, fileName: string) => void = () => {},
  onThumbnailReady: (file: File, thumbnailUrl: string) => void = () => {},
  _concurrency: number = 6,
  filePaths?: Map<File, string>
): Promise<Map<File, string>> {
  const results = new Map<File, string>();
  const total = files.length;
  let completed = 0;

  console.log(`📦 Starting thumbnail generation for ${total} files`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = filePaths?.get(file);
    
    try {
      let thumbnail: string | null = null;

      if (file.type.startsWith('image/')) {
        thumbnail = await generateImageThumbnail(file, filePath ?? undefined);
      } else if (file.type.startsWith('video/')) {
        thumbnail = await generateVideoThumbnail(file);
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
    
    // Yield every 5 files to keep UI responsive
    if (i % 5 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }

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
