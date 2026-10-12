import { Image, ImageOff } from "lucide-react";
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
  // .ai/.eps and .mp4/.mov/... cannot be decoded/displayed by the browser:
  // <video> builds a GStreamer pipeline that crashes WebKit (missing elements
  // like autoaudiosink), and loading video bytes into the heap freezes/ooms.
  // Both use the Rust/FFmpeg preview image instead.
  const isVector = file ? isVectorFile(file) : false;
  const unsupportedMedia = isVector || isVideo;

  const [vectorPreviewUrl, setVectorPreviewUrl] = useState<string | null>(null);
  const [vectorPreviewFailed, setVectorPreviewFailed] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  // Track real failures separately from "still loading" — otherwise a video
  // whose FFmpeg preview is still being generated flashes the error state.
  const [videoPreviewFailed, setVideoPreviewFailed] = useState(false);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      setIsLoaded(false);
      return;
    }
    setIsLoaded(false);
    // Vectors and videos never get a blob URL — the browser can't show them
    // and the <video> pipeline crashes WebKit.
    if (unsupportedMedia) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, unsupportedMedia]);

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

  // Fetch the Rust/FFmpeg preview frame for videos. Videos are empty placeholders
  // (no bytes in the renderer), so a blob URL can never decode — always show the
  // FFmpeg preview image for videos, exactly like vector files.
  useEffect(() => {
    if (!file || !isVideo) {
      setVideoPreviewUrl(null);
      setVideoPreviewFailed(false);
      return;
    }

    const controller = new AbortController();
    setVideoPreviewUrl(lowResUrl ?? null);
    setVideoPreviewFailed(false);
    generatePreviewImage(file, getFilePath(file), controller.signal)
      .then((url) => {
        if (controller.signal.aborted) return;
        if (url) {
          setVideoPreviewUrl(url);
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
  }, [file, isVideo, lowResUrl]);

  if (!file) {
    return (
      <div className="w-full h-full flex items-center justify-center text-6xl text-accent">
        <Image />
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

          {isVideo && videoPreviewUrl && (
            <img
              src={videoPreviewUrl}
              alt={file.name}
              className="w-full h-full object-contain rounded-2xl"
              onLoad={() => setIsLoaded(true)}
            />
          )}

          {isVideo && !videoPreviewUrl && !videoPreviewFailed && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm">Generating preview…</p>
            </div>
          )}

          {isVideo && !videoPreviewUrl && videoPreviewFailed && (
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
