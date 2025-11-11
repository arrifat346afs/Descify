/**
 * Thumbnail Worker
 * Processes image thumbnails in a separate thread to avoid blocking the UI
 */

interface ThumbnailRequest {
  id: string;
  fileData: string; // base64 data URL
  fileName: string;
  maxSize: number;
  quality: number;
}

interface ThumbnailResponse {
  id: string;
  thumbnailUrl: string;
  fileName: string;
  error?: string;
}

// Listen for messages from the main thread
self.onmessage = async (e: MessageEvent<ThumbnailRequest>) => {
  const { id, fileData, fileName, maxSize, quality } = e.data;

  try {
    const thumbnailUrl = await generateThumbnail(fileData, maxSize, quality);
    
    const response: ThumbnailResponse = {
      id,
      thumbnailUrl,
      fileName,
    };
    
    self.postMessage(response);
  } catch (error) {
    const response: ThumbnailResponse = {
      id,
      thumbnailUrl: '',
      fileName,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    
    self.postMessage(response);
  }
};

/**
 * Generate thumbnail from base64 data URL
 */
async function generateThumbnail(
  dataURL: string,
  maxSize: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Calculate new dimensions
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
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob then to data URL
        canvas.convertToBlob({
          type: 'image/jpeg',
          quality: quality / 100,
        }).then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.onerror = () => {
            reject(new Error('Failed to convert blob to data URL'));
          };
          reader.readAsDataURL(blob);
        }).catch(reject);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = dataURL;
  });
}

export {};

