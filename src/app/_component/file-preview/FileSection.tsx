import { CiImageOn } from "react-icons/ci";
import { useState, useEffect } from "react";
import { useSettings } from "@/app/contexts/SettingsContext";

type FileSectionProps = {
  file: File | null;
};

export default function FileSection({ file }: FileSectionProps) {
  if (!file) {
    return (
      <div className="w-full h-full flex items-center justify-center text-6xl text-accent">
        <CiImageOn />
      </div>
    );
  }

  // Get thumbnail from store for instant preview
  const { thumbnails } = useSettings();
  const thumbnailItem = thumbnails.items.find((t) => t.file === file);
  const lowResUrl = thumbnailItem?.thumbnailUrl;

  const [highResUrl, setHighResUrl] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  useEffect(() => {
    // Reset state when file changes
    setIsLoaded(false);
    setHighResUrl(null);

    const objectUrl = URL.createObjectURL(file);
    setHighResUrl(objectUrl);

    // If it's an image, we can try to async decode it to prevent UI freeze
    if (isImage) {
      const img = new Image();
      img.src = objectUrl;
      img.decode()
        .then(() => {
          setIsLoaded(true);
        })
        .catch((err) => {
          console.warn("Failed to decode image:", err);
          // Fallback to showing it anyway (maybe browser can handle it) or just set loaded
          setIsLoaded(true);
        });
    } else {
      // For video, we just set loaded immediately (video element handles buffering)
      setIsLoaded(true);
    }

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, isImage]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 relative">
      {isImage && (
        <div className="relative w-full h-[90%] flex items-center justify-center">
          {/* Low Res Placeholder (Blurry) */}
          {lowResUrl && !isLoaded && (
            <img
              src={lowResUrl}
              alt={file.name}
              className="absolute max-w-full max-h-full object-contain blur-sm opacity-50 transition-opacity duration-300"
            />
          )}

          {/* High Res Image (Fade in) */}
          {highResUrl && (
            <img
              src={highResUrl}
              alt={file.name}
              className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
            />
          )}

          {/* Loading Indicator if no thumbnail and not loaded */}
          {!isLoaded && !lowResUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      )}

      {isVideo && highResUrl && (
        <video
          src={highResUrl}
          className="max-w-full max-h-[90%] object-contain"
          controls
          autoPlay={false}
        />
      )}
      {/* <p className="mt-2 text-sm text-gray-600 text-center truncate max-w-full">{file.name}</p> */}
    </div>
  );
}
