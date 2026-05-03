import { CiImageOn } from "react-icons/ci";
import { useState, useEffect, useRef } from "react";
import { useSettings } from "@/app/contexts/SettingsContext";
import { generatePreviewImage } from "@/app/lib/thumbnailGenerator";

type FileSectionProps = {
  file: File | null;
};

export default function FileSection({ file }: FileSectionProps) {
  const { thumbnails, filePaths } = useSettings();
  const thumbnailItem = thumbnails.items.find((t) => t.file === file);
  const lowResUrl = thumbnailItem?.thumbnailUrl;
  const cachedPreviewUrl = thumbnailItem?.previewUrl;
  const upsertPreview = thumbnails.upsert;
  const filePath = filePaths.get(file);

  const [highResUrl, setHighResUrl] = useState<string | null>(null);
  const [isHighResLoaded, setIsHighResLoaded] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const isImage = file?.type.startsWith("image/") ?? false;
  const isVideo = file?.type.startsWith("video/") ?? false;
  
  const objectUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Early return AFTER all hooks
  if (!file) {
    return (
      <div className="w-full h-full flex items-center justify-center text-6xl text-accent">
        <CiImageOn />
      </div>
    );
  }

  useEffect(() => {
    if (!file) return;
    
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Show loading state immediately
    setIsHighResLoaded(false);
    setHighResUrl(null);
    setIsGeneratingPreview(true);

    const loadPreview = async () => {
      const signal = abortControllerRef.current?.signal;
      if (signal?.aborted) return;

      // If we already have a cached preview, show it immediately
      if (cachedPreviewUrl) {
        setHighResUrl(cachedPreviewUrl);
        setIsHighResLoaded(true);
        setIsGeneratingPreview(false);
        return;
      }

      // If we have a low-res thumbnail, use it while generating high-res
      if (lowResUrl) {
        setHighResUrl(lowResUrl);
        setIsHighResLoaded(false); // Still showing low-res
      }
      
      try {
        const previewUrl = await generatePreviewImage(file, filePath, signal);
        if (signal?.aborted) return;
        
        if (previewUrl) {
          upsertPreview({ file, thumbnailUrl: lowResUrl || '', previewUrl });
          setHighResUrl(previewUrl);
          setIsHighResLoaded(true);
        }
      } catch (error) {
        if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Aborted')) return;
        console.error('Failed to generate preview:', error);
        // Keep showing low-res if available
        setIsHighResLoaded(true);
      }
      
      if (signal?.aborted) return;
      setIsGeneratingPreview(false);
    };

    loadPreview();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [file, filePath, cachedPreviewUrl, lowResUrl, upsertPreview]);

  const showLowRes = lowResUrl && !isHighResLoaded;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 relative">
      {(isImage || isVideo) && (
        <div className="relative w-full h-full flex items-center justify-center">
          {showLowRes && (
            <img
              src={lowResUrl}
              alt={file.name}
              className="absolute max-w-full max-h-full object-contain blur-sm opacity-80"
            />
          )}

          {(highResUrl || lowResUrl) && (
            <img
              src={highResUrl || lowResUrl || undefined}
              alt={file.name}
              className="max-w-full max-h-full object-contain"
            />
          )}

          {isGeneratingPreview && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {!isHighResLoaded && !lowResUrl && !isGeneratingPreview && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
