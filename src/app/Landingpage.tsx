import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from "@tauri-apps/plugin-fs";

import { useSettings } from "./contexts/SettingsContext";

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

export const LandingPage = () => {
  const { setFiles, setHasAttemptedGeneration, setFilePath } = useSettings();
  const [isDragActive, setIsDragActive] = useState(false);

  // Handle files - matches LandingPage.tsx pattern
  const handleFiles = (files: File[]) => {
    console.log("📦 handleFiles called with", files.length, "files");

    const mediaFiles = files.filter(file => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      console.log(`   Checking ${file.name}: type=${file.type}, isImage=${isImage}, isVideo=${isVideo}`);
      return isImage || isVideo;
    });

    console.log("✅ Filtered media files:", mediaFiles.length);

    if (mediaFiles.length > 0) {
      console.log("🚀 Calling setFiles with", mediaFiles.length, "media files");
      mediaFiles.forEach((file, i) => {
        console.log(`   ${i + 1}. ${file.name}`);
      });
      setFiles(mediaFiles);
      setHasAttemptedGeneration(false);
      console.log("✅ setFiles called successfully!");
    } else if (files.length > 0) {
      console.warn("⚠️  No valid media files found. Dropped files:", files.map(f => `${f.name} (${f.type})`));
    } else {
      console.log("❌ No files provided to handleFiles");
    }
  };

  // Native Tauri drag & drop
  useEffect(() => {
    console.log("🔧 Setting up Tauri drag & drop listener");
    const win = getCurrentWindow();

    const unlistenPromise = win.onDragDropEvent(async (event) => {
      console.log("🎯 Tauri drag event:", event.payload.type);

      switch (event.payload.type) {
        case "enter":
          console.log("   Drag enter");
          setIsDragActive(true);
          break;

        case "leave":
          console.log("   Drag leave");
          setIsDragActive(false);
          break;

        case "drop":
          console.log("   Drop detected!");
          setIsDragActive(false);

          const paths = event.payload.paths;
          console.log("   Paths received:", paths);

          if (!paths || paths.length === 0) {
            console.warn("   No paths in drop event");
            return;
          }

          console.log("   Converting", paths.length, "paths to File objects...");
          const files = await Promise.all(
            paths.map(async (path, index) => {
              console.log(`      [${index + 1}] Original path: ${path}`);
              const file = await fileFromPath(path);
              console.log(`      [${index + 1}] Created File: name="${file.name}", type="${file.type}", size=${(file.size / 1024).toFixed(2)}KB`);
              
              // Store the original file path for metadata embedding
              setFilePath(file, path);
              
              return file;
            })
          );

          console.log("   ✅ Files converted:", files.length);
          files.forEach((file, i) => {
            console.log(`      ${i + 1}. ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB)`);
          });

          handleFiles(files);
          break;
      }
    });

    return () => {
      console.log("🧹 Cleaning up Tauri drag & drop listener");
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [setFiles, setHasAttemptedGeneration]); // Dependencies match what handleFiles uses


  // Click-to-select (Tauri dialog)
  const openFiles = async () => {
    console.log("🖱️  Click-to-select triggered");
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
        
        return file;
      })
    );

    console.log("   ✅ Click-to-select files converted:", files.length);
    handleFiles(files);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 gap-8">
      <div
        onClick={openFiles}
        className={`
          w-full max-w-2xl h-[40vh] border-2 border-dashed rounded-xl
          flex flex-col items-center justify-center gap-6
          transition-all duration-200 cursor-pointer
          ${isDragActive
            ? "border-primary bg-primary/10 scale-105"
            : "border-muted-foreground/25 hover:border-primary/50"
          }
        `}
      >
        <div className="p-4 bg-primary/10 rounded-full">
          <Upload className="w-12 h-12 text-primary" />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Upload your files
          </h2>
          <p className="text-muted-foreground">
            {isDragActive
              ? "Drop the files here..."
              : "Drag and drop images or videos here"
            }
          </p>
          <p className="text-sm text-muted-foreground">
            or click to select files
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground text-center max-w-md">
        Supported formats: JPG, PNG, WEBP, MP4, MOV.
        Files are processed locally.
      </p>
    </div>
  );
};
