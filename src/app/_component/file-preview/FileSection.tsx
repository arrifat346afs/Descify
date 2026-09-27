import { CiImageOn } from "react-icons/ci";
import { MdOutlineImageNotSupported } from "react-icons/md";
import { useState, useEffect } from "react";
import { getFilePath, useFileStore } from "@/store/fileStore";
import { isVectorFile } from "@/app/lib/thumbnail/vectorSupport";
import { generatePreviewImage } from "@/app/lib/thumbnailGenerator";
import { ApiCostBadge } from "./ApiCostBadge";

type FileSectionProps = {
  file: File | null;
};

export default function FileSection({ file }: FileSectionProps) {
  const thumbnails = useFileStore((state) => state.thumbnails);
  const thumbnailItem = thumbnails.find((t) => t.file === file);
  const lowResUrl = thumbnailItem?.thumbnailUrl;

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const isImage = file?.type.startsWith("image/") ?? false;
  const isVideo = file?.type.startsWith("video/") ?? false;
  // .ai/.eps cannot be decoded by the browser — the preview is rasterized by
  // the Rust/Ghostscript backend and returned as an asset:// URL.
  const isVector = file ? isVectorFile(file) : false;

  const [vectorPreviewUrl, setVectorPreviewUrl] = useState<string | null>(null);
  const [vectorPreviewFailed, setVectorPreviewFailed] = useState(false);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      setIsLoaded(false);
      return;
    }
    setIsLoaded(false);
    // Vectors get no blob URL: the browser cannot render it, and creating one
    // would just leak an unusable object URL.
    if (isVector) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isVector]);

  // Fetch the rasterized preview for vector files.
  useEffect(() => {
    if (!file || !isVector) {
      setVectorPreviewUrl(null);
      setVectorPreviewFailed(false);
      return;
    }

    const controller = new AbortController();
    setVectorPreviewUrl(null);
    setVectorPreviewFailed(false);

    generatePreviewImage(file, getFilePath(file), controller.signal)
      .then((url) => {
        if (controller.signal.aborted) return;
        if (url) {
          setVectorPreviewUrl(url);
        } else {
          setVectorPreviewFailed(true);
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.warn(`Vector preview failed for ${file.name}:`, error);
        setVectorPreviewFailed(true);
      });

    return () => controller.abort();
  }, [file, isVector]);

  if (!file) {
    return (
      <div className="w-full h-full flex items-center justify-center text-6xl text-accent">
        <CiImageOn />
      </div>
    );
  }

  const vectorUrl = vectorPreviewUrl ?? lowResUrl;

  return (
    <div className="w-full h-full relative overflow-hidden">
      {(isImage || isVideo || isVector) && (
        <div className="relative w-full h-full p-10">
          {lowResUrl && !isLoaded && (
            <img
              src={lowResUrl}
              alt={file.name}
              className="absolute inset-0 w-full h-full object-contain blur-sm opacity-80 rounded-2xl"
            />
          )}

          {isImage && objectUrl && (
            <img
              src={objectUrl}
              alt={file.name}
              className="w-full h-full object-contain rounded-2xl"
              onLoad={() => setIsLoaded(true)}
            />
          )}

          {isVideo && objectUrl && (
            <video
              src={objectUrl}
              autoPlay
              muted
              playsInline
              controls
              className="w-full h-full object-contain rounded-2xl"
              onLoadedData={() => setIsLoaded(true)}
            />
          )}

          {isVector && vectorUrl && (
            <img
              src={vectorUrl}
              alt={file.name}
              className="w-full h-full object-contain rounded-2xl"
              onLoad={() => setIsLoaded(true)}
            />
          )}

          {isVector && !vectorUrl && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <MdOutlineImageNotSupported className="text-6xl" />
              <p className="text-sm">
                {vectorPreviewFailed ? "Preview unavailable" : "Rasterizing preview…"}
              </p>
              {vectorPreviewFailed && (
                <p className="text-xs max-w-md text-center">
                  Ghostscript may not be installed, or this vector file could not be rasterized.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <ApiCostBadge className="absolute bottom-4 left-1/2 -translate-x-1/2" />
    </div>
  );
}
