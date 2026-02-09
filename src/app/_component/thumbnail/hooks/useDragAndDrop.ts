import { useEffect, useState, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { fileFromPath } from '../utils';

interface UseDragAndDropOptions {
  onFilesAdded: (files: File[]) => void;
  onFilePathStored?: (file: File, path: string) => void;
  onExifDataFound?: (file: File, path: string) => void;
  activeTab?: 'category' | 'batch'; // Add active tab prop
}

export const useDragAndDrop = ({ onFilesAdded, onFilePathStored, onExifDataFound, activeTab }: UseDragAndDropOptions) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFiles = useCallback((newFiles: File[]) => {
    console.log("📦 ThumbnailSection handleFiles called with", newFiles.length, "files");

    const mediaFiles = newFiles.filter(file => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      // Accept files with unknown MIME types that might be video files with incomplete metadata
      const isUnknownType = file.type === 'application/octet-stream';
      const hasVideoExtension = file.name.toLowerCase().match(/\.(mp4|mov|webm|avi|mkv|flv|wmv|m4v|3gp|ogv|mts|m2ts)$/);
      
      console.log(`   Checking ${file.name}: type=${file.type}, isImage=${isImage}, isVideo=${isVideo}, isUnknownType=${isUnknownType}, hasVideoExtension=${!!hasVideoExtension}`);
      return isImage || isVideo || (isUnknownType && hasVideoExtension);
    });

    console.log("✅ Filtered media files:", mediaFiles.length);

    if (mediaFiles.length > 0) {
      onFilesAdded(mediaFiles);
      console.log("✅ Files added successfully!");
    } else if (newFiles.length > 0) {
      console.warn("⚠️  No valid media files found. Dropped files:", newFiles.map(f => `${f.name} (${f.type})`));
    } else {
      console.log("❌ No files provided to handleFiles");
    }
  }, [onFilesAdded]);

  // Native Tauri drag & drop for thumbnail section only
  useEffect(() => {
    console.log("🔧 Setting up ThumbnailSection Tauri drag & drop listener. Active tab:", activeTab);
    
    // Only set up the listener when Category tab is active
    if (activeTab === 'batch') {
      console.log("🚫 Batch tab is active - not setting up Tauri drag listener");
      return;
    }

    const win = getCurrentWindow();

    const unlistenPromise = win.onDragDropEvent(async (event) => {
      console.log("🎯 ThumbnailSection Tauri drag event:", event.payload.type);

      switch (event.payload.type) {
        case "enter":
          console.log("   Drag enter thumbnail section");
          setIsDragActive(true);
          break;

        case "leave":
          console.log("   Drag leave thumbnail section");
          setIsDragActive(false);
          break;

        case "drop":
          console.log("   Drop detected in thumbnail section!");
          setIsDragActive(false);

          const paths = event.payload.paths;
          console.log("   Paths received:", paths);

          if (!paths || paths.length === 0) {
            console.warn("   No paths in drop event");
            return;
          }

          console.log("   Converting", paths.length, "paths to File objects...");
          const newFiles: File[] = [];
          for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            console.log(`      [${i + 1}] Original path: ${path}`);
            const file = await fileFromPath(path);
            console.log(`      [${i + 1}] Created File: name="${file.name}", type="${file.type}", size=${(file.size / 1024).toFixed(2)}KB`);
            
            // Store the original file path for metadata embedding
            if (onFilePathStored) {
              onFilePathStored(file, path);
            }
            
            // Trigger EXIF data reading
            if (onExifDataFound) {
              onExifDataFound(file, path);
            }
            
            newFiles.push(file);
          }

          console.log("   ✅ Files converted:", newFiles.length);
          newFiles.forEach((file, i) => {
            console.log(`      ${i + 1}. ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB)`);
          });

          handleFiles(newFiles);
          break;
      }
    });

    return () => {
      console.log("🧹 Cleaning up ThumbnailSection Tauri drag & drop listener");
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [handleFiles, onFilePathStored, onExifDataFound, activeTab]);

  return { isDragActive };
};
