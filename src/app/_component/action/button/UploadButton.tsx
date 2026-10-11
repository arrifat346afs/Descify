import { Button } from "@/components/ui/button";
import { useState } from "react";
import React from "react";
import { UploadIcon } from "@/components/ui/upload";
import { open } from '@tauri-apps/plugin-dialog';
import { readFile, stat } from "@tauri-apps/plugin-fs";
import { readExifMetadata } from "@/app/lib/tauri/tauri-commands";
import { VECTOR_MIME_TYPE } from "@/app/lib/thumbnail/vectorSupport";
import { shouldPrefillFromExif } from "@/app/lib/metadata/metadataStatus";
import { setFiles, addFiles, setFilePath } from "@/store/fileStore";
import { setHasAttemptedGeneration } from "@/store/uiStore";
import { updateFileMetadata } from "@/store/metadataStore";

// Convert a file path to a File object with proper MIME type.
// Video bytes ARE loaded (via readFile) so browser fallbacks that need real
// content — <video> preview via blob URL, canvas frame capture — keep working.
// An empty placeholder File (size 0) decodes to nothing: thumbnails fall back
// to a failing path, the preview player shows black, and AI generation that
// relies on frame capture throws. Large videos cost memory, but correctness
// comes first; the Rust/FFmpeg path (which streams from disk) remains the
// primary thumbnail source via the stored file path.
//
// Stability guard: videos larger than LARGE_VIDEO_BYTES stay path-only
// (empty placeholder). Loading e.g. a 1 GB video into the renderer heap can
// OOM/crash the WebKit web process (full-app black screen); the FFmpeg
// preview image (via the stored file path) covers display + AI for those.
const LARGE_VIDEO_BYTES = 150 * 1024 * 1024;
const fileFromPath = async (path: string): Promise<File> => {
  const name = path.split("/").pop() ?? "file";
  const ext = name.split('.').pop()?.toLowerCase() ?? '';

  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
    'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml',
    'ai': VECTOR_MIME_TYPE, 'eps': VECTOR_MIME_TYPE,
    'mp4': 'video/mp4', 'mov': 'video/quicktime', 'webm': 'video/webm',
  };
  // Fall back to extension-derived video MIME for formats not in the map
  // (avi/mkv/flv/...) so isThumbnailableFile + <video> playback still match.
  const fallbackVideoMime =
    ['avi', 'mkv', 'flv', 'wmv', 'm4v', '3gp', 'ogv', 'mts', 'm2ts'].includes(ext)
      ? `video/${ext}`
      : '';
  const mimeType = mimeTypes[ext] || fallbackVideoMime;
  const isVideo = mimeType.startsWith('video/');

  if (isVideo) {
    try {
      const meta = await stat(path);
      if (meta.size > LARGE_VIDEO_BYTES) {
        console.warn(
          `⚠️ Large video "${name}" (${(meta.size / 1024 / 1024).toFixed(1)} MB) — ` +
          `keeping path-only placeholder; preview uses the FFmpeg image.`
        );
        return new File([], name, { type: mimeType });
      }
    } catch {
      // stat failed (e.g. scope) — fall through and try the full read.
    }
  }

  const data = await readFile(path);
  return new File([data], name, { type: mimeType });
};

type UploadButtonProps = {
  onFilesSelected: (files: File[]) => void;
};

// How many files to read from disk in parallel
const UPLOAD_CONCURRENCY = 5;

const VIDEO_EXTS = ['mp4', 'mov', 'webm', 'avi', 'mkv', 'flv', 'wmv', 'm4v', '3gp', 'ogv', 'mts', 'm2ts'];

const UploadButtonComponent = ({ }: UploadButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = async () => {
    console.log("🖱️  Upload button clicked - opening Tauri file dialog");
    const result = await open({
      multiple: true,
      filters: [
        {
          name: "Media",
          extensions: ["jpg", "jpeg", "png", "gif", "webp", "svg", "ai", "eps", ...VIDEO_EXTS]
        }
      ]
    });

    if (!result) {
      console.log("   User cancelled file selection");
      return;
    }

    const paths = Array.isArray(result) ? result : [result];
    console.log("   Selected paths:", paths.length);

    // Clear existing files immediately so the UI resets right away
    setFiles([]);
    setHasAttemptedGeneration(false);

    // Separate images and videos - process videos one at a time to avoid UI hang
    const imagePaths: string[] = [];
    const videoPaths: string[] = [];
    
    for (const path of paths) {
      const ext = path.split('.').pop()?.toLowerCase() ?? '';
      if (VIDEO_EXTS.includes(ext)) {
        videoPaths.push(path);
      } else {
        imagePaths.push(path);
      }
    }

    console.log(`📁 Processing: ${imagePaths.length} images, ${videoPaths.length} videos`);

    // Process images with high concurrency
    const imageQueue = [...imagePaths];
    const processImage = async (path: string) => {
      const file = await fileFromPath(path);
      setFilePath(file, path);
      addFiles([file]);
      
      if (file.type !== 'image/svg+xml') {
        readExifMetadata(path).then(exifData => {
          // Vectors (.ai/.eps) only carry an auto-generated Title, which
          // shouldPrefillFromExif rejects in favour of real content.
          if (shouldPrefillFromExif(file, exifData)) {
            updateFileMetadata(file, {
              title: exifData.title || '',
              description: exifData.description || '',
              keywords: exifData.keywords || ''
            });
          }
        }).catch(() => {});
      }
    };

    await Promise.all(
      Array(Math.min(UPLOAD_CONCURRENCY, imagePaths.length)).fill(null).map(async () => {
        while (imageQueue.length > 0) {
          const path = imageQueue.shift();
          if (path) await processImage(path);
        }
      })
    );

    // Process videos one at a time to prevent UI freeze.
    // Full bytes are loaded so preview playback + canvas fallback work.
    for (const path of videoPaths) {
      const file = await fileFromPath(path);
      setFilePath(file, path);
      addFiles([file]);
      
      readExifMetadata(path).then(exifData => {
        if (shouldPrefillFromExif(file, exifData)) {
          updateFileMetadata(file, {
            title: exifData.title || '',
            description: exifData.description || '',
            keywords: exifData.keywords || ''
          });
        }
      }).catch(() => {});
    }

    console.log(`✅ All ${paths.length} files queued for display`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Button
        onClick={handleClick}
        variant={"ghost"}
        className="gap-2 group h-full max-h-10 min-h-8 2xl:w-30 2xl:max-h-13 2xl:text-sm"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <UploadIcon isHovered={isHovered} />
        Upload
      </Button>
    </div>
  );
};

export const UploadButton = React.memo(UploadButtonComponent);
  

