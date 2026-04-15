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

const VIDEO_CONCURRENCY = 2;
const IMAGE_CONCURRENCY = 6;

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

async function generateVideoThumbnailRust(filePath: string, size: number = BATCH_CONFIG.MAX_THUMBNAIL_SIZE, signal?: AbortSignal): Promise<string | null> {
  if (signal?.aborted) {
    return null;
  }
  
  const cacheKey = `video_${filePath}_${size}`;
  
  if (thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey) ?? null;
  }
  
  try {
    if (signal?.aborted) {
      return null;
    }
    
    const result = await invoke<GeneratedThumbnailResult>('generate_video_thumbnail_command', {
      filePath,
      size
    });
    
    if (signal?.aborted) {
      return null;
    }
    
    const thumbnail = result.thumbnail_base64 
      ? `data:image/jpeg;base64,${result.thumbnail_base64}` 
      : null;
    
    thumbnailCache.set(cacheKey, thumbnail);
    return thumbnail;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return null;
    }
    console.warn('Video thumbnail generation failed:', error);
    thumbnailCache.set(cacheKey, null);
    return null;
  }
}

async function generateVideoPreviewRust(filePath: string, size: number = PREVIEW_CONFIG.MAX_SIZE, signal?: AbortSignal): Promise<string | null> {
  if (signal?.aborted) {
    return null;
  }
  
  const cacheKey = `video_preview_${filePath}_${size}`;
  
  if (thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey) ?? null;
  }
  
  try {
    if (signal?.aborted) {
      return null;
    }
    
    const result = await invoke<GeneratedPreviewResult>('generate_video_preview_command', {
      filePath,
      size
    });
    
    if (signal?.aborted) {
      return null;
    }
    
    const preview = result.preview_base64 
      ? `data:image/jpeg;base64,${result.preview_base64}` 
      : null;
    
    thumbnailCache.set(cacheKey, preview);
    return preview;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return null;
    }
    console.warn('Video preview generation failed:', error);
    thumbnailCache.set(cacheKey, null);
    return null;
  }
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

export async function generateAIImage(file: File, filePath?: string): Promise<string> {
  if (file.type.startsWith('video/') && filePath) {
    const videoThumb = await generateVideoThumbnailRust(filePath, AI_IMAGE_CONFIG.MAX_SIZE);
    if (videoThumb) return videoThumb;
    return generateVideoThumbnail(file);
  }
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
        
        if (result.preview_base64) {
          const preview = `data:image/jpeg;base64,${result.preview_base64}`;
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
  _concurrency: number = BATCH_CONFIG.CONCURRENCY,
  filePaths?: Map<File, string>
): Promise<Map<File, string>> {
  const results = new Map<File, string>();
  const total = files.length;
  let completed = 0;

  const imageFiles = files.filter(f => f.type.startsWith('image/'));
  const videoFiles = files.filter(f => f.type.startsWith('video/'));

  console.log(`📦 Starting thumbnail generation: ${imageFiles.length} images, ${videoFiles.length} videos`);

  const processFile = async (file: File, filePath?: string): Promise<void> => {
    try {
      let thumbnail: string | null = null;

      if (file.type.startsWith('image/')) {
        thumbnail = await generateImageThumbnail(file, filePath ?? undefined);
      } else if (file.type.startsWith('video/')) {
        if (filePath) {
          thumbnail = await generateVideoThumbnailRust(filePath);
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
  };

  const processBatch = async (batch: File[], filePathList: (string | undefined)[], batchConcurrency: number): Promise<void> => {
    for (let i = 0; i < batch.length; i += batchConcurrency) {
      const subBatch = batch.slice(i, i + batchConcurrency);
      const subBatchPaths = filePathList.slice(i, i + batchConcurrency);
      
      await Promise.all(
        subBatch.map((file, idx) => processFile(file, subBatchPaths[idx]))
      );

      await new Promise(r => setTimeout(r, 0));
    }
  };

  if (imageFiles.length > 0) {
    const imagePaths = imageFiles.map(f => filePaths?.get(f));
    await processBatch(imageFiles, imagePaths, IMAGE_CONCURRENCY);
  }

  if (videoFiles.length > 0) {
    const videoPaths = videoFiles.map(f => filePaths?.get(f));
    await processBatch(videoFiles, videoPaths, VIDEO_CONCURRENCY);
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
