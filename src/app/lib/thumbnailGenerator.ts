/**
 * Thumbnail Generation Module
 * Uses Sharp (via Tauri/Node.js) for fast, high-quality thumbnail generation
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Converts a File object to a base64 data URL
 */
async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a thumbnail for an image file using Sharp (via Tauri/Node.js)
 * This runs asynchronously and uses Sharp for high-quality, fast image processing
 *
 * @param file - The image file to generate a thumbnail for
 * @returns Promise<string> - Base64 data URL of the thumbnail
 */
export async function generateImageThumbnail(file: File): Promise<string> {
  try {
    // Convert file to base64 data URL
    const dataURL = await fileToDataURL(file);

    // Call Tauri command which runs Sharp via Node.js
    const thumbnailURL = await invoke<string>('generate_sharp_thumbnail', {
      fileData: dataURL
    });

    return thumbnailURL;
  } catch (error) {
    console.error('Failed to generate thumbnail with Sharp:', error);
    throw error;
  }
}

/**
 * Generates a video thumbnail by capturing a frame
 * Falls back to browser-based implementation for now
 * TODO: Implement video thumbnail generation in Rust backend
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

      // Convert to JPEG (70% quality)
      const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);

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
 * @param concurrency - Maximum number of concurrent thumbnail generations (default: 4)
 */
export async function generateThumbnailsBatch(
  files: File[],
  onProgress?: (completed: number, total: number, fileName: string) => void,
  concurrency: number = 4
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
          } else if (isVideo) {
            const thumbnail = await generateVideoThumbnail(file);
            results.set(file, thumbnail);
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

