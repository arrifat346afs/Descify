/**
 * Thumbnail Generation Module
 * Uses Web Workers for non-blocking thumbnail generation
 */

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
 * Worker pool for parallel thumbnail generation
 */
class ThumbnailWorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private queue: Array<{
    file: File;
    resolve: (url: string) => void;
    reject: (error: Error) => void;
  }> = [];
  private workerCount: number;

  constructor(workerCount: number = 4) {
    this.workerCount = workerCount;
  }

  private createWorker(): Worker {
    const worker = new Worker(
      new URL('../workers/thumbnailWorker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e) => {
      const { fileName, error } = e.data;

      if (error) {
        console.error(`Worker error for ${fileName}:`, error);
      }

      // Make worker available again
      this.availableWorkers.push(worker);

      // Process next item in queue
      this.processQueue();
    };

    return worker;
  }

  private async processQueue() {
    if (this.queue.length === 0 || this.availableWorkers.length === 0) {
      return;
    }

    const worker = this.availableWorkers.shift()!;
    const task = this.queue.shift()!;

    try {
      const dataURL = await fileToDataURL(task.file);
      const id = Math.random().toString(36).substring(7);

      // Set up one-time listener for this specific task
      const handler = (e: MessageEvent) => {
        if (e.data.id === id) {
          worker.removeEventListener('message', handler);
          if (e.data.error) {
            task.reject(new Error(e.data.error));
          } else {
            task.resolve(e.data.thumbnailUrl);
          }
        }
      };

      worker.addEventListener('message', handler);

      worker.postMessage({
        id,
        fileData: dataURL,
        fileName: task.file.name,
        maxSize: 512,
        quality: 70,
      });
    } catch (error) {
      task.reject(error as Error);
      this.availableWorkers.push(worker);
      this.processQueue();
    }
  }

  async generateThumbnail(file: File): Promise<string> {
    // Initialize workers on first use
    if (this.workers.length === 0) {
      for (let i = 0; i < this.workerCount; i++) {
        const worker = this.createWorker();
        this.workers.push(worker);
        this.availableWorkers.push(worker);
      }
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ file, resolve, reject });
      this.processQueue();
    });
  }

  terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    this.queue = [];
  }
}

// Global worker pool instance
let workerPool: ThumbnailWorkerPool | null = null;

/**
 * Generates a thumbnail for an image file using Web Workers
 * This runs asynchronously in a separate thread and doesn't block the UI
 *
 * @param file - The image file to generate a thumbnail for
 * @returns Promise<string> - Base64 data URL of the thumbnail
 */
export async function generateImageThumbnail(file: File): Promise<string> {
  if (!workerPool) {
    workerPool = new ThumbnailWorkerPool(4);
  }

  return workerPool.generateThumbnail(file);
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

