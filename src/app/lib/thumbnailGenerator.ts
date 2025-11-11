/**
 * Thumbnail Generation Module
 * Uses browser Canvas API for fast thumbnail generation
 */

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

    img.onload = () => {
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

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG (85% quality for good balance)
      const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);

      URL.revokeObjectURL(objectUrl);
      resolve(thumbnailUrl);
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

    video.onseeked = () => {
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

      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(video, 0, 0, width, height);

      // Convert to JPEG (85% quality)
      const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);

      URL.revokeObjectURL(objectUrl);
      resolve(thumbnailUrl);
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
 *
 * @param files - Array of files to generate thumbnails for
 * @param onProgress - Optional callback for progress updates
 * @param onThumbnailReady - Callback when each individual thumbnail is ready
 * @param concurrency - Maximum number of concurrent thumbnail generations (default: 8)
 */
export async function generateThumbnailsBatch(
  files: File[],
  onProgress?: (completed: number, total: number, fileName: string) => void,
  onThumbnailReady?: (file: File, thumbnailUrl: string) => void,
  concurrency: number = 8
): Promise<Map<File, string>> {
  const results = new Map<File, string>();
  const queue = [...files];
  let completed = 0;
  const total = files.length;

  // Process files with concurrency limit
  const workers = Array(Math.min(concurrency, files.length))
    .fill(null)
    .map(async () => {
      while (queue.length > 0) {
        const file = queue.shift();
        if (!file) break;

        try {
          const isImage = file.type.startsWith('image/');
          const isVideo = file.type.startsWith('video/');

          if (isImage) {
            const thumbnail = await generateImageThumbnail(file);
            results.set(file, thumbnail);

            // Immediately notify that this thumbnail is ready
            if (onThumbnailReady) {
              onThumbnailReady(file, thumbnail);
            }
          } else if (isVideo) {
            const thumbnail = await generateVideoThumbnail(file);
            results.set(file, thumbnail);

            // Immediately notify that this thumbnail is ready
            if (onThumbnailReady) {
              onThumbnailReady(file, thumbnail);
            }
          }

          completed++;
          if (onProgress) {
            onProgress(completed, total, file.name);
          }
        } catch (error) {
          console.error(`Failed to generate thumbnail for ${file.name}:`, error);
          // Continue with other files even if one fails
        }
      }
    });

  await Promise.all(workers);
  return results;
}

