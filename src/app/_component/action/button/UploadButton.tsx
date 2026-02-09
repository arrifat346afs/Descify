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

const UploadButtonComponent = ({ onFilesSelected }: UploadButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { setHasAttemptedGeneration, setFilePath, generated } = useSettings();

  const handleClick = async () => {
    console.log("🖱️  Upload button clicked - opening Tauri file dialog");
    const result = await open({
      multiple: true,
      filters: [
        {
          name: "Media",
          extensions: ["jpg", "jpeg", "png", "gif", "webp", "mp4", "mov", "webm"]
        }
      ]
    });

    if (!result) {
      console.log("   User cancelled file selection");
      return;
    }

    const paths = Array.isArray(result) ? result : [result];
    console.log("   Selected paths:", paths);

    const files = await Promise.all(
      paths.map(async (path, index) => {
        console.log(`      [${index + 1}] Original path: ${path}`);
        const file = await fileFromPath(path);
        console.log(`      [${index + 1}] Created File: name="${file.name}", type="${file.type}", size=${(file.size / 1024).toFixed(2)}KB`);
        
        // Store the original file path for metadata embedding
        setFilePath(file, path);
        
        // Read EXIF metadata and populate fields if found
        try {
          console.log(`      [${index + 1}] Reading EXIF metadata...`);
          const exifData = await readExifMetadata(path);
          
          if (exifData.title || exifData.description || exifData.keywords) {
            console.log(`      [${index + 1}] Found embedded metadata - Title: ${exifData.title ? 'yes' : 'no'}, Description: ${exifData.description ? 'yes' : 'no'}, Keywords: ${exifData.keywords ? 'yes' : 'no'}`);
            
            // Populate metadata fields with EXIF data
            generated.setMetadata(file, {
              title: exifData.title || '',
              description: exifData.description || '',
              keywords: exifData.keywords || ''
            });
          } else {
            console.log(`      [${index + 1}] No embedded metadata found`);
          }
        } catch (error) {
          console.warn(`      [${index + 1}] Failed to read EXIF metadata:`, error);
          // Continue without EXIF data - not a fatal error
        }
        
        return file;
      })
    );

    console.log("   ✅ Upload button files converted:", files.length);
    if (onFilesSelected) {
      onFilesSelected(files);
    }
    // Reset validation state when new files are uploaded
    setHasAttemptedGeneration(false);
    console.log("Selected files:", files);
  };

  return (
    <div className="flex flex-col items-center">
      <Button
        onClick={handleClick}
        variant={"ghost"}
        className="gap-2 group"
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
  

