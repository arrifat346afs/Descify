import { useEffect, useRef } from "react";
import { useSettings } from "@/app/contexts/SettingsContext";
import { ScrollArea, ScrollBar } from "../../../components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";

type ThumbnailSectionProps = {
  onSelectFile: (file: File) => void;
};

const ThumbnailSection = ({ onSelectFile }: ThumbnailSectionProps) => {
  const { files, thumbnails: thumbsCtx, generated, hasAttemptedGeneration, selectedFile } = useSettings();
  const thumbnails = thumbsCtx.items;
  const thumbnailRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  console.log('ThumbnailSection render - files:', files?.length, 'thumbnails:', thumbnails?.length);

  // Auto-scroll to selected thumbnail
  useEffect(() => {
    if (selectedFile) {
      const fileName = selectedFile.name;
      const thumbnailElement = thumbnailRefs.current.get(fileName);

      if (thumbnailElement) {
        console.log('📜 Auto-scrolling to:', fileName);
        thumbnailElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [selectedFile]);

  const generateThumbnail = async (file: File) => {
    try {
      console.log('⚡ Creating optimized thumbnail for:', file.name);

      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (isImage) {
        // Create a small, compressed thumbnail for images
        const thumbnailUrl = await createImageThumbnail(file);
        console.log('✓ Image thumbnail ready:', file.name);
        thumbsCtx.upsert({ file, thumbnailUrl });
        return thumbnailUrl;
      } else if (isVideo) {
        // For videos, capture a frame at 1 second
        const thumbnailUrl = await createVideoThumbnail(file);
        console.log('✓ Video thumbnail ready:', file.name);
        thumbsCtx.upsert({ file, thumbnailUrl });
        return thumbnailUrl;
      }

      return null;
    } catch (error) {
      console.error("❌ Error creating thumbnail for", file.name, ":", error);
      return null;
    }
  };

  // Create optimized image thumbnail (512px max, 70% quality)
  const createImageThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        // Calculate new dimensions (max 512px on longest side)
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

        // Convert to compressed JPEG (70% quality)
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);

        URL.revokeObjectURL(objectUrl);
        resolve(thumbnailUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };

      img.src = objectUrl;
    });
  };

  // Create video thumbnail by capturing frame at 1 second
  const createVideoThumbnail = (file: File): Promise<string> => {
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

        // Convert to compressed JPEG
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);

        URL.revokeObjectURL(objectUrl);
        resolve(thumbnailUrl);
      };

      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load video'));
      };

      video.src = objectUrl;
      video.load();
    });
  };

  // Generate thumbnails when files change
  useEffect(() => {
    console.log('📁 Files changed:', files?.length, 'files');
    console.log('🖼️  Current thumbnails in context:', thumbsCtx.items.length);

    if (!files || files.length === 0) {
      thumbsCtx.setIsGenerating(false);
      return;
    }

    // Count how many thumbnails need to be generated
    const filesToGenerate = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const alreadyHasThumbnail = thumbnails.find((t) => t.file === file);
      return (isImage || isVideo) && !alreadyHasThumbnail;
    });

    if (filesToGenerate.length === 0) {
      thumbsCtx.setIsGenerating(false);
      return;
    }

    // Set generating state
    thumbsCtx.setIsGenerating(true);
    console.log(`🚀 Starting generation of ${filesToGenerate.length} thumbnails...`);

    // Generate thumbnails for all files that don't have one yet
    filesToGenerate.forEach((file) => {
      console.log('⚡ Triggering thumbnail generation for:', file.name);
      generateThumbnail(file);
    });
  }, [files]); // Only depend on files, not thumbnails to avoid infinite loop

  // Check if all thumbnails are done
  useEffect(() => {
    if (thumbsCtx.isGenerating && files && files.length > 0) {
      const allDone = files.every((file) => {
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");
        if (!isImage && !isVideo) return true; // Skip non-media files
        return thumbnails.find((t) => t.file === file) !== undefined;
      });

      if (allDone) {
        console.log('✅ All thumbnails generated!');
        thumbsCtx.setIsGenerating(false);
      }
    }
  }, [thumbnails, files, thumbsCtx.isGenerating]);

  return (
    <div className="w-400">
      {(!files || files.length === 0) && (
        <p className="text-gray-500 text-center mt-4">No files selected.</p>
      )}

      {files && files.length > 0 && (
        <ScrollArea className="p-2 w-full overflow-hidden">
          <div className="flex space-x-4 px-4 py-2 w-max">
            {files.map((file, index) => {
              const thumbnail = thumbnails.find((t) => t.file === file);
              const url = thumbnail?.thumbnailUrl || URL.createObjectURL(file);

              // Check if this file has generated metadata
              const hasMetadata = generated.getMetadata(file) !== undefined;

              // Border color: green if has metadata, red only if user attempted generation and still missing metadata
              const borderClass = hasMetadata
                ? "border border-green-500"
                : hasAttemptedGeneration
                ? "border border-red-500"
                : "border border-gray-300";

              return (
                <div
                  key={index}
                  ref={(el) => {
                    if (el) {
                      thumbnailRefs.current.set(file.name, el);
                    } else {
                      thumbnailRefs.current.delete(file.name);
                    }
                  }}
                  onClick={() => onSelectFile(file)}
                  className={`${borderClass} rounded-md shadow overflow-hidden cursor-pointer hover:scale-105 transition-transform w-[30vh] shrink-0`}
                >
                  <AspectRatio ratio={12 / 9} className="active:border-blue-500 border">
                    <img
                      src={url}
                      alt={file.name}
                      className="w-full h-40 object-cover"
                    />
                    <p className="p-2 text-sm truncate text-center text-gray-600">
                      {file.name}
                    </p>
                  </AspectRatio>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
};

export default ThumbnailSection;
