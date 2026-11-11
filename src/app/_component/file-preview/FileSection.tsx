import { Image, ImageOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useFileStore } from "@/store/fileStore";
import { isVectorFile } from "@/app/lib/thumbnail/vectorSupport";
import { generatePreviewImage } from "@/app/lib/thumbnailGenerator";
import { ApiCostBadge } from "./ApiCostBadge";

type FileSectionProps = {
  file: File | null;
};

export default function FileSection({ file }: FileSectionProps) {
  const thumbnails = useFileStore((state) => state.thumbnails);
  const filePath = useFileStore((state) => file ? state.filePaths.get(file) : undefined);
  const thumbnailItem = thumbnails.find((t) => t.file === file);
  const lowResUrl = thumbnailItem?.thumbnailUrl;
  const cachedPreviewUrl = thumbnailItem?.previewUrl ?? null;

  const [isLoaded, setIsLoaded] = useState(false);
  const isImage = file?.type.startsWith("image/") ?? false;
  const isVideo = file?.type.startsWith("video/") ?? false;
  // .ai/.eps and .mp4/.mov/... cannot be decoded/displayed by the browser:
  // <video> builds a GStreamer pipeline that crashes WebKit (missing elements
  // like autoaudiosink), and loading video bytes into the heap freezes/ooms.
  // Both use the Rust/FFmpeg preview image instead.
  const isVector = file ? isVectorFile(file) : false;

  const [vectorPreview, setVectorPreview] = useState<{ file: File; url: string } | null>(null);
  const [vectorPreviewFailed, setVectorPreviewFailed] = useState(false);
  const [videoPreview, setVideoPreview] = useState<{ file: File; url: string } | null>(null);
  // Track real failures separately from "still loading" — otherwise a video
  // whose FFmpeg preview is still being generated flashes the error state.
  const [videoPreviewFailed, setVideoPreviewFailed] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    if (!file) {
      return;
    }
  }, [file]);

  // Generate a bounded display preview for regular images instead of asking
  // the webview to decode the original full-resolution file. The thumbnail
  // remains visible while this larger preview is being prepared.
  useEffect(() => {
    if (!file || !isImage) {
      setImagePreview(null);
      setImagePreviewFailed(false);
      return;
    }

    const controller = new AbortController();
    setImagePreview(cachedPreviewUrl ? { file, url: cachedPreviewUrl } : null);
    setImagePreviewFailed(false);

    if (cachedPreviewUrl) return () => controller.abort();

    generatePreviewImage(file, filePath, controller.signal)
      .then((url) => {
        if (controller.signal.aborted) return;
        if (url) {
          setImagePreview({ file, url });
        } else {
          setImagePreviewFailed(true);
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.warn(`Image preview failed for ${file.name}:`, error);
        setImagePreviewFailed(true);
      });

    return () => controller.abort();
  }, [file, filePath, isImage, cachedPreviewUrl]);

  // Fetch the rasterized preview for vector files.
  useEffect(() => {
    if (!file || !isVector) {
      setVectorPreview(null);
      setVectorPreviewFailed(false);
      return;
    }

    const controller = new AbortController();
    setVectorPreview(cachedPreviewUrl ? { file, url: cachedPreviewUrl } : null);
    setVectorPreviewFailed(false);

    if (cachedPreviewUrl) return () => controller.abort();

    generatePreviewImage(file, filePath, controller.signal)
      .then((url) => {
        if (controller.signal.aborted) return;
        if (url) {
          setVectorPreview({ file, url });
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
  }, [file, filePath, isVector, cachedPreviewUrl]);

  // Fetch the Rust/FFmpeg preview frame for videos. Videos are empty placeholders
  // (no bytes in the renderer), so a blob URL can never decode — always show the
  // FFmpeg preview image for videos, exactly like vector files.
  useEffect(() => {
    if (!file || !isVideo) {
      setVideoPreview(null);
      setVideoPreviewFailed(false);
      return;
    }

    const controller = new AbortController();
    setVideoPreview(cachedPreviewUrl ? { file, url: cachedPreviewUrl } : null);
    setVideoPreviewFailed(false);
    if (cachedPreviewUrl) return () => controller.abort();
    generatePreviewImage(file, filePath, controller.signal)
      .then((url) => {
        if (controller.signal.aborted) return;
        if (url) {
          setVideoPreview({ file, url });
        } else {
          setVideoPreviewFailed(true);
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.warn(`Video preview failed for ${file.name}:`, error);
        setVideoPreviewFailed(true);
      });

    return () => controller.abort();
  }, [file, filePath, isVideo, lowResUrl, cachedPreviewUrl]);

  if (!file) {
    return (
      <div className="w-full h-full flex items-center justify-center text-6xl text-accent">
        <Image />
      </div>
    );
  }

  // Prefer data for the currently selected file before local async state, so
  // a just-switched file never briefly shows the previous file's preview.
  const imageUrl = cachedPreviewUrl ?? (imagePreview?.file === file ? imagePreview.url : null) ?? lowResUrl;
  const vectorUrl = cachedPreviewUrl ?? (vectorPreview?.file === file ? vectorPreview.url : null) ?? lowResUrl;
  const currentVideoPreviewUrl = cachedPreviewUrl ?? (videoPreview?.file === file ? videoPreview.url : null) ?? lowResUrl;

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

          {isImage && imageUrl && (
            <img
              src={imageUrl}
              alt={file.name}
              className="w-full h-full object-contain rounded-2xl"
              onLoad={() => setIsLoaded(true)}
            />
          )}

          {isImage && !imageUrl && !imagePreviewFailed && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm">Generating preview…</p>
            </div>
          )}

          {isImage && !imageUrl && imagePreviewFailed && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageOff className="text-6xl" />
              <p className="text-sm">Image preview unavailable</p>
            </div>
          )}

          {isVideo && currentVideoPreviewUrl && (
            <img
              src={currentVideoPreviewUrl}
              alt={file.name}
              className="w-full h-full object-contain rounded-2xl"
              onLoad={() => setIsLoaded(true)}
            />
          )}

          {isVideo && !currentVideoPreviewUrl && !videoPreviewFailed && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm">Generating preview…</p>
            </div>
          )}

          {isVideo && !currentVideoPreviewUrl && videoPreviewFailed && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageOff className="text-6xl" />
              <p className="text-sm">Video preview unavailable</p>
              <p className="text-xs max-w-md text-center">
                The FFmpeg preview frame could not be produced for this video.
              </p>
            </div>
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
              <ImageOff className="text-6xl" />
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
