import { CiImageOn } from "react-icons/ci";
import { useState, useEffect, useRef } from "react";
import { useSettings } from "@/app/contexts/SettingsContext";
import { generatePreviewImage } from "@/app/lib/thumbnailGenerator";

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

  const { thumbnails } = useSettings();
  const thumbnailItem = thumbnails.items.find((t) => t.file === file);
  const lowResUrl = thumbnailItem?.thumbnailUrl;
  const cachedPreviewUrl = thumbnailItem?.previewUrl;
  const upsertPreview = thumbnails.upsert;

  const [highResUrl, setHighResUrl] = useState<string | null>(null);
  const [isHighResLoaded, setIsHighResLoaded] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  
  const objectUrlRef = useRef<string | null>(null);
  const generatedRef = useRef<Set<File>>(new Set());

  useEffect(() => {
    setIsHighResLoaded(false);
    setHighResUrl(null);
    setIsGeneratingPreview(false);
    
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    const loadPreview = async () => {
      if (isImage && cachedPreviewUrl && !generatedRef.current.has(file)) {
        setHighResUrl(cachedPreviewUrl);
        setIsHighResLoaded(true);
        generatedRef.current.add(file);
        return;
      }

      if (isImage && !cachedPreviewUrl && !generatedRef.current.has(file)) {
        generatedRef.current.add(file);
        setIsGeneratingPreview(true);
        try {
          const previewUrl = await generatePreviewImage(file);
          upsertPreview({ file, thumbnailUrl: lowResUrl || '', previewUrl });
          setHighResUrl(previewUrl);
          setIsHighResLoaded(true);
        } catch (error) {
          console.error('Failed to generate preview:', error);
          const objectUrl = URL.createObjectURL(file);
          objectUrlRef.current = objectUrl;
          setHighResUrl(objectUrl);
          const img = new Image();
          img.onload = () => setIsHighResLoaded(true);
          img.src = objectUrl;
        }
        setIsGeneratingPreview(false);
        return;
      }

      if (cachedPreviewUrl && generatedRef.current.has(file)) {
        setHighResUrl(cachedPreviewUrl);
        setIsHighResLoaded(true);
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      setHighResUrl(objectUrl);

      if (isImage) {
        const img = new Image();
        img.onload = () => setIsHighResLoaded(true);
        img.src = objectUrl;
      } else {
        setIsHighResLoaded(true);
      }
    };

    loadPreview();

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [file, isImage, cachedPreviewUrl, lowResUrl, upsertPreview]);

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

          {/* Loading Indicator while generating preview */}
          {isGeneratingPreview && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Loading Indicator if no thumbnail and not loaded */}
          {!isHighResLoaded && !lowResUrl && !isGeneratingPreview && (
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
    </div>
  );
}
