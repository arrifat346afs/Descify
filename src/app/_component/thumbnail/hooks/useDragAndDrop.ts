import { useEffect, useState, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { fileFromPath } from '../utils';

interface UseDragAndDropOptions {
  onFilesAdded: (files: File[]) => void;
  /** Called immediately for each valid file as it is converted — enables instant loading UI */
  onFileAdded?: (file: File) => void;
  onFilePathStored?: (file: File, path: string) => void;
  onExifDataFound?: (file: File, path: string) => void;
  activeTab?: 'category' | 'batch'; // Add active tab prop
}

/** Returns true when a file is a valid image or video that should be accepted */
const isValidMediaFile = (file: File): boolean => {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const isUnknownType = file.type === 'application/octet-stream';
  const hasVideoExtension = !!file.name.toLowerCase().match(/\.(mp4|mov|webm|avi|mkv|flv|wmv|m4v|3gp|ogv|mts|m2ts)$/);
  console.log(`   Checking ${file.name}: type=${file.type}, isImage=${isImage}, isVideo=${isVideo}, isUnknownType=${isUnknownType}, hasVideoExtension=${hasVideoExtension}`);
  return isImage || isVideo || (isUnknownType && hasVideoExtension);
};

export const useDragAndDrop = ({ onFilesAdded, onFileAdded, onFilePathStored, onExifDataFound, activeTab }: UseDragAndDropOptions) => {
  const [isDragActive, setIsDragActive] = useState(false);

  // Legacy batch handler — used as fallback when onFileAdded is not provided
  const handleFiles = useCallback((newFiles: File[]) => {
    console.log("📦 ThumbnailSection handleFiles called with", newFiles.length, "files");
    const mediaFiles = newFiles.filter(isValidMediaFile);
    console.log("✅ Filtered media files:", mediaFiles.length);
    if (mediaFiles.length > 0) {
      onFilesAdded(mediaFiles);
      console.log("✅ Files added successfully!");
    } else if (newFiles.length > 0) {
      console.warn("⚠️  No valid media files found. Dropped files:", newFiles.map(f => `${f.name} (${f.type})`));
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

          if (onFileAdded) {
            // Per-file path: add each file to state immediately after it is read
            // so the loading thumbnail appears without waiting for the whole batch.
            for (const path of paths) {
              const file = await fileFromPath(path);
              console.log(`✅ Dropped file ready: name="${file.name}", type="${file.type}", size=${(file.size / 1024).toFixed(2)}KB`);

              if (!isValidMediaFile(file)) continue;

              if (onFilePathStored) onFilePathStored(file, path);

              // Show loading thumbnail immediately
              onFileAdded(file);

              // EXIF is non-blocking — fire and forget
              if (onExifDataFound) onExifDataFound(file, path);
            }
            console.log(`✅ All ${paths.length} dropped paths queued`);
          } else {
            // Fallback: legacy batch mode
            const newFiles: File[] = [];
            for (const path of paths) {
              const file = await fileFromPath(path);
              if (onFilePathStored) onFilePathStored(file, path);
              if (onExifDataFound) onExifDataFound(file, path);
              newFiles.push(file);
            }
            handleFiles(newFiles);
          }
          break;
      }
    });

    return () => {
      console.log("🧹 Cleaning up ThumbnailSection Tauri drag & drop listener");
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [handleFiles, onFileAdded, onFilePathStored, onExifDataFound, activeTab]);

  return { isDragActive };
};
