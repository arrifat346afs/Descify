// Web Worker for thumbnail generation
// Handles resizing of large images off the main thread

const MAX_THUMBNAIL_SIZE = 150;
const JPEG_QUALITY = 0.5;

self.onmessage = async (e: MessageEvent<File>) => {
    const file = e.data;

    try {
        // fast path: createImageBitmap (available in workers)
        const bitmap = await createImageBitmap(file);

        // Calculate dimensions
        let width = bitmap.width;
        let height = bitmap.height;

        // Calculate scale to fit within MAX_THUMBNAIL_SIZE while maintaining aspect ratio
        if (width > MAX_THUMBNAIL_SIZE || height > MAX_THUMBNAIL_SIZE) {
            const scale = Math.min(MAX_THUMBNAIL_SIZE / width, MAX_THUMBNAIL_SIZE / height);
            width = Math.floor(width * scale);
            height = Math.floor(height * scale);
        }

        // Use OffscreenCanvas if available
        if (typeof OffscreenCanvas !== 'undefined') {
            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d', { alpha: false }) as OffscreenCanvasRenderingContext2D;

            if (!ctx) throw new Error('Could not get context');

            ctx.drawImage(bitmap, 0, 0, width, height);

            // Convert to Blob
            const blob = await canvas.convertToBlob({
                type: 'image/jpeg',
                quality: JPEG_QUALITY
            });

            // We need to convert Blob to Data URL (base64) so it can be sent to main thread 
            // and stored in Redux/displayed easily.
            // FileReader is available in workers.
            const reader = new FileReader();
            reader.onloadend = () => {
                self.postMessage({
                    success: true,
                    file: file, // Echo back file for ID (or just rely on promise correlation)
                    thumbnailUrl: reader.result as string
                });
                bitmap.close();
            };
            reader.onerror = () => {
                self.postMessage({ success: false, error: 'Read error' });
                bitmap.close();
            };
            reader.readAsDataURL(blob);

        } else {
            // Fallback if OffscreenCanvas is not supported (unlikely in modern browsers but possible)
            // We can't use regular Canvas in worker.
            // We'll just return failure and let main thread handle fallback.
            bitmap.close();
            self.postMessage({ success: false, error: 'OffscreenCanvas not supported' });
        }

    } catch (error) {
        self.postMessage({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
