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

// Unused imports and helpers removed

/**
 * Helper to yield control back to the browser's main thread
 * Optimized: minimal delay, just enough to prevent blocking
 */
function yieldToMain(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// Worker Pool Management
class WorkerPool {
  private workers: Worker[] = [];
  private queue: Array<{
    file: File;
    resolve: (url: string) => void;
    reject: (err: any) => void;
  }> = [];
  private maxWorkers = navigator.hardwareConcurrency ? Math.max(2, navigator.hardwareConcurrency / 2) : 4;

  constructor() {
    this.initWorkers();
  }

  private initWorkers() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(new URL('./thumbnail.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => this.handleWorkerMessage(worker, e);
      worker.onerror = (e) => this.handleWorkerError(worker, e);
      this.workers.push(worker);
    }
  }

  private handleWorkerMessage(worker: Worker, e: MessageEvent) {
    const { success, thumbnailUrl, error } = e.data;
    const currentJob = (worker as any).currentJob;

    if (currentJob) {
      if (success) {
        currentJob.resolve(thumbnailUrl);
      } else {
        currentJob.reject(new Error(error));
      }
      (worker as any).currentJob = null;
    }

    this.processQueue();
  }

  private handleWorkerError(worker: Worker, e: ErrorEvent) {
    const currentJob = (worker as any).currentJob;
    if (currentJob) {
      currentJob.reject(new Error(e.message));
      (worker as any).currentJob = null;
    }
    this.processQueue();
  }

  private processQueue() {
    if (this.queue.length === 0) return;

    // Find idle worker
    const idleWorker = this.workers.find(w => !(w as any).currentJob);

    if (idleWorker) {
      const job = this.queue.shift();
      if (job) {
        (idleWorker as any).currentJob = job;
        idleWorker.postMessage(job.file);
      }
    }
  }

  public schedule(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({ file, resolve, reject });
      this.processQueue();
    });
  }

  public terminate() {
    this.workers.forEach(w => w.terminate());
    this.workers = [];
  }
}

// Singleton pool instance
let thumbnailWorkerPool: WorkerPool | null = null;

function getWorkerPool(): WorkerPool {
  if (!thumbnailWorkerPool) {
    thumbnailWorkerPool = new WorkerPool();
  }
  return thumbnailWorkerPool;
}

/**
 * Generates a thumbnail for an image file
 * Uses Web Worker for off-thread processing to keep UI smooth
 *
 * @param file - The image file to generate a thumbnail for
 * @returns Promise<string> - Base64 data URL of the thumbnail
 */
export async function generateImageThumbnail(file: File): Promise<string> {
  // Logic: 
  // 1. Try Worker (Small thumbnail, non-blocking)
  // 2. Fallback to URL.createObjectURL if worker fails (Instant but heavy memory/CPU on render)

  try {
    return await getWorkerPool().schedule(file);
  } catch (error) {
    console.warn("Worker generation failed, falling back to ObjectURL:", error);
    return URL.createObjectURL(file);
  }
}

/**
 * Fast image thumbnail generation using createImageBitmap
 * Optimized for MAXIMUM SPEED with large images
 */
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
  // 480px fits safely within a single 512x512 tile for vision models
  MAX_SIZE: 480,
  // 60% quality - strict reduction for payload efficiency
  JPEG_QUALITY: 0.6,
};

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

  console.log(`🚀 DEBUG: generateAIImage called with file: ${file.name}, size: ${(file.size / 1024).toFixed(2)}KB`);
  console.log(`🎯 TARGET CONFIG: maxSize=${maxSize}px, quality=${quality}`);

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
    
    // Add detailed debugging for image generation
    const imageSizeKB = Math.round(dataUrl.length / 1024);
    const imageDataSize = dataUrl.length;
    const estimatedTokens = Math.ceil(imageDataSize / 4);
    
    console.log(`🔍 DEBUG - Main Method:`);
    console.log(`  Canvas: ${maxSize}x${maxSize}px`);
    console.log(`  Draw size: ${drawWidth}x${drawHeight}px`);
    console.log(`  Image size: ${imageSizeKB} KB (${imageDataSize} chars)`);
    console.log(`  Est. image tokens: ~${estimatedTokens}`);
    console.log(`  Quality: ${quality}`);
    
    // Verify the data URL format and extract actual dimensions if possible
    const headerSize = dataUrl.indexOf('base64,') + 7;
    const base64Size = dataUrl.length - headerSize;
    console.log(`  Base64 payload: ${base64Size} chars`);
    
    console.log(`✅ AI Image generated: ${imageSizeKB} KB`);
    
    if (imageSizeKB > 200) {
      console.warn(`⚠️ Generated image is large: ${imageSizeKB}KB (expected ~50-100KB for 480p)`);
    }
    
    // Final verification
    if (imageSizeKB > 300) {
      console.error(`❌ CRITICAL: Image size ${imageSizeKB}KB indicates bug - should be ~50-100KB for 480p!`);
    }
    
    return dataUrl;
  } catch (error) {
    // Fallback for browsers without createImageBitmap resize support
    console.log(`⚠️ Main method failed, using FALLBACK method:`, error);
    return generateAIImageFallback(file);
  }
}

/**
 * Fallback AI image generation for older browsers
 */
function generateAIImageFallback(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`🔄 FALLBACK METHOD STARTED for: ${file.name}`);
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
        canvas.width = maxSize;  // Fixed 480x480 canvas like main method
        canvas.height = maxSize; // Fixed 480x480 canvas like main method
        const ctx = canvas.getContext('2d', { alpha: false });

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Center the image on the canvas (same as main method)
        const x = (maxSize - width) / 2;
        const y = (maxSize - height) / 2;
        ctx.drawImage(img, x, y, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', AI_IMAGE_CONFIG.JPEG_QUALITY);
        
        // Add detailed debugging for fallback method
        const imageSizeKB = Math.round(dataUrl.length / 1024);
        const imageDataSize = dataUrl.length;
        const estimatedTokens = Math.ceil(imageDataSize / 4);
        
        console.log(`🔍 DEBUG - Fallback Method:`);
        console.log(`  Original image: ${img.width}x${img.height}px`);
        console.log(`  Scaled to: ${width}x${height}px`);
        console.log(`  Canvas: ${maxSize}x${maxSize}px`);
        console.log(`  Image size: ${imageSizeKB} KB (${imageDataSize} chars)`);
        console.log(`  Est. image tokens: ~${estimatedTokens}`);
        console.log(`✅ AI Fallback Image generated: ${imageSizeKB} KB`);
        
        if (imageSizeKB > 200) {
          console.warn(`⚠️ Fallback image is large: ${imageSizeKB}KB (expected ~50-100KB for 480p)`);
        }

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
// Simplified video thumbnail generation - just generate one frame
// We still use canvas here because <video> poster doesn't support seeking efficiently without loading
// BUT we can optimize it to be faster or just return a generic icon if speed is paramount.
// For now, let's keep the frame capture but optimize it.
export function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.autoplay = false;
    video.playsInline = true;
    const objectUrl = URL.createObjectURL(file);

    // Timeout for videos that fail to load
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      video.src = '';
      reject(new Error(`Timeout loading video: ${file.name}`));
    }, 4000); // Reduced timeout

    video.onloadeddata = () => {
      // Just take the first frame immediately for speed
      video.currentTime = 0;
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const maxSize = BATCH_CONFIG.MAX_THUMBNAIL_SIZE;
        // Use simpler resizing logic
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
        // Use low quality JPEG for speed
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.5);

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

