/**
 * Thumbnail Generation Module
 * Uses thumbo (Rust + WebAssembly) for fast image thumbnail generation
 * Falls back to Canvas API for video thumbnails
 *
 * Optimized for handling 3000+ images with:
 * - Chunked processing to prevent memory exhaustion
 * - Lazy loading for off-screen thumbnails
 * - Aggressive memory cleanup between batches
 * - Reduced thumbnail quality/size for better performance
 */

import Thumbo, { Transfer } from 'thumbo';

// Track thumbo initialization state
let thumboInitialized = false;
let thumboInitPromise: Promise<void> | null = null;

// Configuration for display thumbnails - MAXIMUM SPEED
const BATCH_CONFIG = {
  // Maximum concurrent thumbnail generations
  CONCURRENCY: 12,
  // Thumbnail max dimension (smaller = faster)
  MAX_THUMBNAIL_SIZE: 150,
  // JPEG quality (lower = faster encoding)
  JPEG_QUALITY: 0.5,
};

// Configuration for AI-quality images - balance between quality and API cost
const AI_IMAGE_CONFIG = {
  // 512px is enough for AI to understand content, keeps token cost low
  MAX_SIZE: 512,
  // 75% quality - good enough for AI, reduces payload size
  JPEG_QUALITY: 0.75,
};

/**
 * Initialize thumbo library with higher concurrency for speed
 */
async function initThumbo(): Promise<void> {
  if (thumboInitialized) return;
  if (!thumboInitPromise) {
    // Higher concurrency for faster processing
    thumboInitPromise = Thumbo.init({ size: 4, concurrency: 4 }).then(() => {
      thumboInitialized = true;
      console.log('✅ Thumbo initialized with WebAssembly workers');
    });
  }
  return thumboInitPromise;
}

/**
 * Force garbage collection hint by clearing references
 */
function forceMemoryCleanup(): Promise<void> {
  return new Promise(resolve => {
    // Use setTimeout to give browser a chance to GC
    setTimeout(() => {
      // Hint to browser that we want GC
      if (typeof window !== 'undefined' && 'gc' in window) {
        try {
          (window as unknown as { gc: () => void }).gc();
        } catch {
          // GC not available, that's okay
        }
      }
      resolve();
    }, 0);
  });
}

/**
 * Get the image format enum from file type
 */
function getImageFormat(mimeType: string): number | null {
  const formatMap: Record<string, number> = {
    'image/png': Thumbo.ImageFormat.Png,
    'image/jpeg': Thumbo.ImageFormat.Jpeg,
    'image/jpg': Thumbo.ImageFormat.Jpeg,
    'image/gif': Thumbo.ImageFormat.Gif,
    'image/x-icon': Thumbo.ImageFormat.Ico,
    'image/vnd.microsoft.icon': Thumbo.ImageFormat.Ico,
    'image/svg+xml': Thumbo.ImageFormat.Svg,
  };
  return formatMap[mimeType] ?? null;
}

/**
 * Convert a Blob to a data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Helper to yield control back to the browser's main thread
 * Optimized: minimal delay, just enough to prevent blocking
 */
function yieldToMain(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Generates a thumbnail for an image file
 * Uses createImageBitmap as PRIMARY method - it's fastest for large files (10MB+)
 * Only falls back to Thumbo for small files where WASM might help
 *
 * @param file - The image file to generate a thumbnail for
 * @returns Promise<string> - Base64 data URL of the thumbnail
 */
export async function generateImageThumbnail(file: File): Promise<string> {
  // For large files (>1MB), always use createImageBitmap - it's much faster
  // because it doesn't need to load the entire file into memory first
  if (file.size > 1024 * 1024) {
    return generateImageThumbnailCanvas(file);
  }

  // For small files, try thumbo (WASM) - might be faster for small images
  const format = getImageFormat(file.type);
  if (format !== null) {
    try {
      await initThumbo();

      const arrayBuffer = await file.arrayBuffer();
      const maxSize = BATCH_CONFIG.MAX_THUMBNAIL_SIZE;

      const thumbnailBuffer = await Thumbo.thumbnail(
        Transfer(arrayBuffer),
        format,
        maxSize,
        maxSize
      );

      const blob = new Blob([thumbnailBuffer], { type: file.type });
      const dataUrl = await blobToDataUrl(blob);
      return dataUrl;
    } catch (error) {
      console.warn(`Thumbo failed for ${file.name}, using Canvas:`, error);
    }
  }

  return generateImageThumbnailCanvas(file);
}

/**
 * Fast image thumbnail generation using createImageBitmap
 * Optimized for MAXIMUM SPEED with large images
 */
async function generateImageThumbnailCanvas(file: File): Promise<string> {
  const maxSize = BATCH_CONFIG.MAX_THUMBNAIL_SIZE;

  try {
    // Use createImageBitmap with 'low' quality for maximum speed
    const bitmap = await createImageBitmap(file, {
      resizeWidth: maxSize,
      resizeHeight: maxSize,
      resizeQuality: 'low', // Fastest option
    });

    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) {
      bitmap.close();
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close(); // Important: release bitmap memory

    const thumbnailUrl = canvas.toDataURL('image/jpeg', BATCH_CONFIG.JPEG_QUALITY);
    return thumbnailUrl;
  } catch {
    // Fallback for browsers that don't support createImageBitmap with options
    return generateImageThumbnailCanvasFallback(file);
  }
}

/**
 * Fallback for older browsers without createImageBitmap resize support
 */
function generateImageThumbnailCanvasFallback(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      img.src = '';
      reject(new Error(`Timeout loading image: ${file.name}`));
    }, 10000); // Longer timeout for large files

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const maxSize = BATCH_CONFIG.MAX_THUMBNAIL_SIZE;
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
        const thumbnailUrl = canvas.toDataURL('image/jpeg', BATCH_CONFIG.JPEG_QUALITY);

        URL.revokeObjectURL(objectUrl);
        img.src = '';
        resolve(thumbnailUrl);
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
 * Generates a HIGH-QUALITY image for AI metadata generation
 * Called on-demand only when user requests metadata for a specific file
 *
 * This is separate from display thumbnails which are low-quality for speed.
 * AI needs higher resolution to accurately describe image content.
 *
 * @param file - The image file to process
 * @returns Promise<string> - Base64 data URL suitable for AI vision APIs
 */
export async function generateAIImage(file: File): Promise<string> {
  const maxSize = AI_IMAGE_CONFIG.MAX_SIZE;
  const quality = AI_IMAGE_CONFIG.JPEG_QUALITY;

  try {
    // Use createImageBitmap for efficient processing of large files
    const bitmap = await createImageBitmap(file, {
      resizeWidth: maxSize,
      resizeHeight: maxSize,
      resizeQuality: 'high', // High quality for AI analysis
    });

    // CRITICAL: Don't use bitmap.width/height - browsers ignore resize options
    // Always create canvas at maxSize and maintain aspect ratio
    const canvas = document.createElement('canvas');
    let drawWidth = maxSize;
    let drawHeight = maxSize;
    
    // Maintain aspect ratio - scale down to fit within maxSize square
    const bitmapAspect = bitmap.width / bitmap.height;
    if (bitmapAspect > 1) {
      // Wider than tall
      drawHeight = Math.round(maxSize / bitmapAspect);
    } else {
      // Taller than wide
      drawWidth = Math.round(maxSize * bitmapAspect);
    }
    
    canvas.width = maxSize;
    canvas.height = maxSize;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) {
      bitmap.close();
      throw new Error('Failed to get canvas context');
    }

    // Center the image on the canvas
    const x = (maxSize - drawWidth) / 2;
    const y = (maxSize - drawHeight) / 2;
    ctx.drawImage(bitmap, x, y, drawWidth, drawHeight);
    bitmap.close();

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return dataUrl;
  } catch {
    // Fallback for browsers without createImageBitmap resize support
    return generateAIImageFallback(file);
  }
}

/**
 * Fallback AI image generation for older browsers
 */
function generateAIImageFallback(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      img.src = '';
      reject(new Error(`Timeout loading image for AI: ${file.name}`));
    }, 15000); // Longer timeout for HQ processing

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const maxSize = AI_IMAGE_CONFIG.MAX_SIZE;
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
        const dataUrl = canvas.toDataURL('image/jpeg', AI_IMAGE_CONFIG.JPEG_QUALITY);

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
      reject(new Error('Failed to load image for AI'));
    };

    img.src = objectUrl;
  });
}

/**
 * Generates a video thumbnail by capturing a frame
 * Optimized for speed
 */
export function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    // Timeout for videos that fail to load
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      video.src = '';
      reject(new Error(`Timeout loading video: ${file.name}`));
    }, 8000);

    video.onloadeddata = () => {
      // Seek to 1 second (or 10% of duration, whichever is less)
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const maxSize = BATCH_CONFIG.MAX_THUMBNAIL_SIZE;
        let width = video.videoWidth;
        let height = video.videoHeight;

        // Calculate scaled dimensions
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
          video.src = '';
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(video, 0, 0, width, height);
        const thumbnailUrl = canvas.toDataURL('image/jpeg', BATCH_CONFIG.JPEG_QUALITY);

        // Cleanup
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

/**
 * Batch generates thumbnails for multiple files with high concurrency
 * Optimized for speed while still handling 3000+ images
 *
 * @param files - Array of files to generate thumbnails for
 * @param onProgress - Optional callback for progress updates
 * @param onThumbnailReady - Callback when each individual thumbnail is ready
 * @param _concurrency - Deprecated, uses BATCH_CONFIG.CONCURRENCY instead
 */
export async function generateThumbnailsBatch(
  files: File[],
  onProgress?: (completed: number, total: number, fileName: string) => void,
  onThumbnailReady?: (file: File, thumbnailUrl: string) => void,
  _concurrency: number = BATCH_CONFIG.CONCURRENCY
): Promise<Map<File, string>> {
  const results = new Map<File, string>();
  const total = files.length;
  let completed = 0;
  const queue = [...files];
  const concurrency = BATCH_CONFIG.CONCURRENCY;

  console.log(`📦 Starting thumbnail generation for ${total} files (concurrency: ${concurrency})`);

  // Create worker pool
  const workers = Array(Math.min(concurrency, files.length))
    .fill(null)
    .map(async () => {
      let processedInBatch = 0;

      while (queue.length > 0) {
        const file = queue.shift();
        if (!file) break;

        try {
          const isImage = file.type.startsWith('image/');
          const isVideo = file.type.startsWith('video/');
          let thumbnail: string | null = null;

          if (isImage) {
            thumbnail = await generateImageThumbnail(file);
          } else if (isVideo) {
            thumbnail = await generateVideoThumbnail(file);
          }

          if (thumbnail) {
            results.set(file, thumbnail);
            completed++;

            if (onProgress) {
              onProgress(completed, total, file.name);
            }
            if (onThumbnailReady) {
              onThumbnailReady(file, thumbnail);
            }
          }

          processedInBatch++;

          // Yield every N files to keep UI responsive (only for large batches)
          if (total > 100 && processedInBatch % 10 === 0) {
            await yieldToMain();
          }
        } catch (error) {
          console.error(`Failed to generate thumbnail for ${file.name}:`, error);
          completed++; // Count failed as completed to keep progress moving
        }
      }
    });

  await Promise.all(workers);

  // One final memory cleanup for large batches
  if (total > 100) {
    await forceMemoryCleanup();
  }

  console.log(`✅ Completed ${results.size}/${total} thumbnails`);
  return results;
}

