import { Button } from "@/components/ui/button";
import { useState } from "react";
import React from "react";
import { UploadIcon } from "@/components/ui/upload";
import { open } from '@tauri-apps/plugin-dialog';
import { readExifMetadata } from "@/app/lib/tauri/tauri-commands";
import { shouldPrefillFromExif } from "@/app/lib/metadata/metadataStatus";
import { setFiles, addFiles, setFilePath } from "@/store/fileStore";
import { setHasAttemptedGeneration } from "@/store/uiStore";
import { updateFileMetadata } from "@/store/metadataStore";
import { fileFromPath } from "../../thumbnail/utils";
import { VIDEO_EXTENSIONS } from "@/app/lib/thumbnail/mediaTypes";

type UploadButtonProps = {
  onFilesSelected: (files: File[]) => void;
};

// How many files to read from disk in parallel
const UPLOAD_CONCURRENCY = 5;

const UploadButtonComponent = ({ }: UploadButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = async () => {
    console.log("🖱️  Upload button clicked - opening Tauri file dialog");
    const result = await open({
      multiple: true,
      filters: [
        {
          name: "Media",
          extensions: ["jpg", "jpeg", "png", "gif", "webp", "svg", "ai", "eps", ...VIDEO_EXTENSIONS]
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
      if ((VIDEO_EXTENSIONS as readonly string[]).includes(ext)) {
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
  

