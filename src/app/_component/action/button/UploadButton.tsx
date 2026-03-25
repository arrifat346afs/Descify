import { Button } from "@/components/ui/button";
import { useState } from "react";
import React from "react";
import { useSettings } from "@/app/contexts/SettingsContext";
import { UploadIcon } from "@/components/ui/upload";
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from "@tauri-apps/plugin-fs";
import { readExifMetadata } from "@/app/lib/tauri-commands";

// Helper to get MIME type from file extension
const getMimeType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    // Videos
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'webm': 'video/webm',
  };
  return mimeTypes[ext] || '';
};

// Convert a file path to a File object with proper MIME type
const fileFromPath = async (path: string): Promise<File> => {
  const data = await readFile(path);
  const name = path.split("/").pop() ?? "file";
  const mimeType = getMimeType(name);
  console.log(`🔍 fileFromPath: ${name} -> MIME type: ${mimeType}`);
  return new File([data], name, { type: mimeType });
};

type UploadButtonProps = {
  onFilesSelected: (files: File[]) => void;
};

// How many files to read from disk in parallel
const UPLOAD_CONCURRENCY = 5;

const UploadButtonComponent = ({ }: UploadButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { setHasAttemptedGeneration, setFilePath, generated, setFiles, addFiles } = useSettings();

  const handleClick = async () => {
    console.log("🖱️  Upload button clicked - opening Tauri file dialog");
    const result = await open({
      multiple: true,
      filters: [
        {
          name: "Media",
          extensions: ["jpg", "jpeg", "png", "gif", "webp", "svg", "mp4", "mov", "webm"]
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

    // Process files with limited concurrency so each file appears on screen
    // as soon as it is read from disk — no waiting for the whole batch.
    const queue = [...paths];

    const processPath = async (path: string) => {
      const file = await fileFromPath(path);
      console.log(`✅ Loaded: name="${file.name}", type="${file.type}", size=${(file.size / 1024).toFixed(2)}KB`);

      // Store the original file path for metadata embedding
      setFilePath(file, path);

      // Add this single file to state immediately → shows loading thumbnail
      addFiles([file]);

      // Read EXIF in the background — do NOT await so the next file starts loading
      readExifMetadata(path).then(exifData => {
        if (exifData.title || exifData.description || exifData.keywords) {
          generated.setMetadata(file, {
            title: exifData.title || '',
            description: exifData.description || '',
            keywords: exifData.keywords || ''
          });
        }
      }).catch(error => {
        console.warn(`⚠️ Failed to read EXIF for ${file.name}:`, error);
      });
    };

    // Spin up UPLOAD_CONCURRENCY workers that drain the queue
    await Promise.all(
      Array(Math.min(UPLOAD_CONCURRENCY, paths.length)).fill(null).map(async () => {
        while (queue.length > 0) {
          const path = queue.shift();
          if (path) await processPath(path);
        }
      })
    );

    console.log(`✅ All ${paths.length} files queued for display`);
  };

  return (
    <div className="flex flex-col items-center">
      <Button
        onClick={handleClick}
        variant={"ghost"}
        className="gap-2 group h-10"
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
  

