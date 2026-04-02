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
  const [isHighResLoaded, setIsHighResLoaded] = useState(false);
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  useEffect(() => {
    // Reset state when file changes
    setIsHighResLoaded(false);
    setHighResUrl(null);

    const objectUrl = URL.createObjectURL(file);
    setHighResUrl(objectUrl);

    // For images, listen for load event to show high-res
    if (isImage) {
      const img = new Image();
      img.onload = () => setIsHighResLoaded(true);
      img.src = objectUrl;
    } else {
      setIsHighResLoaded(true);
    }

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, isImage]);

  const showLowRes = lowResUrl && !isHighResLoaded;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 relative">
      {isImage && (
        <div className="relative w-full h-[90%] flex items-center justify-center">
          {/* Low Res Placeholder (Blurry) */}
          {showLowRes && (
            <img
              src={lowResUrl}
              alt={file.name}
              className="absolute max-w-full max-h-full object-contain blur-sm opacity-80"
            />
          )}

          {/* High Res Image (Fade in) */}
          {highResUrl && (
            <img
              src={highResUrl}
              alt={file.name}
              className={`max-w-full max-h-full object-contain transition-opacity duration-200 ${isHighResLoaded ? "opacity-100" : "opacity-0"}`}
            />
          )}

          {/* Loading Indicator if no thumbnail and not loaded */}
          {!isHighResLoaded && !lowResUrl && (
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
