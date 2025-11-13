/**
 * Thumbnail Generation Module
 * Uses browser Canvas API for fast thumbnail generation
 */

/**
 * Helper to yield control back to the browser's main thread
 * Uses requestIdleCallback when available, falls back to setTimeout
 */
function yieldToMain(): Promise<void> {
  return new Promise(resolve => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => resolve(), { timeout: 50 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Helper to yield using requestAnimationFrame for smoother UI updates
 */
function yieldToAnimationFrame(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      // Double RAF for better frame timing
      requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * Generates a thumbnail for an image file using Canvas API
 * This is fast and runs entirely in the browser
 *
 * @param file - The image file to generate a thumbnail for
 * @returns Promise<string> - Base64 data URL of the thumbnail
 */
export async function generateImageThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      try {
        // Calculate dimensions (max 512px, maintain aspect ratio)
        const maxSize = 512;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        // Yield before heavy canvas operations
        await yieldToMain();

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', {
          willReadFrequently: false,
          alpha: false // Disable alpha for better performance
        });

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw image in chunks for large images to prevent blocking
        ctx.drawImage(img, 0, 0, width, height);

        // Yield before encoding (most expensive operation)
        await yieldToAnimationFrame();

        // Convert to JPEG (70% quality for faster encoding)
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);

        URL.revokeObjectURL(objectUrl);
        resolve(thumbnailUrl);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * Generates a video thumbnail by capturing a frame
 * Uses Canvas API for fast processing
 *
 * @param file - The video file to generate a thumbnail for
 * @returns Promise<string> - Base64 data URL of the thumbnail
 */
export async function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    video.onloadeddata = () => {
      // Seek to 1 second (or 10% of duration, whichever is less)
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = async () => {
      try {
        // Calculate dimensions (max 512px)
        const maxSize = 512;
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        // Yield before canvas operations
        await yieldToMain();

        // Create canvas and capture frame
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', {
          willReadFrequently: false,
          alpha: false // Disable alpha for better performance
        });

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(video, 0, 0, width, height);

        // Yield before encoding
        await yieldToAnimationFrame();

        // Convert to JPEG (70% quality)
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);

        URL.revokeObjectURL(objectUrl);
        resolve(thumbnailUrl);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load video'));
    };

    video.src = objectUrl;
  });
}

/**
 * Batch generates thumbnails for multiple files
 * Processes files in parallel with a concurrency limit to avoid overwhelming the system
 * Uses batching and yielding to prevent UI blocking
 *
 * @param files - Array of files to generate thumbnails for
 * @param onProgress - Optional callback for progress updates
 * @param onThumbnailReady - Callback when each individual thumbnail is ready
 * @param concurrency - Maximum number of concurrent thumbnail generations (default: 3)
 */
export async function generateThumbnailsBatch(
  files: File[],
  onProgress?: (completed: number, total: number, fileName: string) => void,
  onThumbnailReady?: (file: File, thumbnailUrl: string) => void,
  concurrency: number = 3
): Promise<Map<File, string>> {
  const results = new Map<File, string>();
  const queue = [...files];
  let completed = 0;
  const total = files.length;

  // Batch thumbnails to update UI less frequently
  const pendingUpdates: Array<{ file: File; thumbnailUrl: string }> = [];
  let updateScheduled = false;

  const scheduleUpdate = () => {
    if (updateScheduled || pendingUpdates.length === 0) return;

    updateScheduled = true;
    requestAnimationFrame(() => {
      // Process all pending updates in one batch
      const updates = [...pendingUpdates];
      pendingUpdates.length = 0;
      updateScheduled = false;

      if (onThumbnailReady) {
        updates.forEach(({ file, thumbnailUrl }) => {
          onThumbnailReady(file, thumbnailUrl);
        });
      }
    });
  };

  // Process files with concurrency limit
  const workers = Array(Math.min(concurrency, files.length))
    .fill(null)
    .map(async (_, _workerIndex) => {
      while (queue.length > 0) {
        const file = queue.shift();
        if (!file) break;

        try {
          const isImage = file.type.startsWith('image/');
          const isVideo = file.type.startsWith('video/');

          if (isImage) {
            const thumbnail = await generateImageThumbnail(file);
            results.set(file, thumbnail);

            // Queue update instead of immediate callback
            pendingUpdates.push({ file, thumbnailUrl: thumbnail });
            scheduleUpdate();
          } else if (isVideo) {
            const thumbnail = await generateVideoThumbnail(file);
            results.set(file, thumbnail);

            // Queue update instead of immediate callback
            pendingUpdates.push({ file, thumbnailUrl: thumbnail });
            scheduleUpdate();
          }

          completed++;
          if (onProgress) {
            onProgress(completed, total, file.name);
          }

          // Yield between files to keep UI responsive
          await yieldToAnimationFrame();
        } catch (error) {
          console.error(`Failed to generate thumbnail for ${file.name}:`, error);
          // Continue with other files even if one fails
        }
      }
    });

  await Promise.all(workers);

  // Flush any remaining updates
  if (pendingUpdates.length > 0 && onThumbnailReady) {
    pendingUpdates.forEach(({ file, thumbnailUrl }) => {
      onThumbnailReady(file, thumbnailUrl);
    });
  }

  return results;
}

