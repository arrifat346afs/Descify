import { useCallback, useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "@/components/ui/button";
import { UploadIcon } from "@/components/ui/upload";
import { FolderOpen, Plus } from "lucide-react";

type FolderDropZoneProps = {
  onFolderSelected: (folderPath: string) => void;
  disabled?: boolean;
  compact?: boolean;
};

export const FolderDropZone = ({ onFolderSelected, disabled = false, compact = false }: FolderDropZoneProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Set up manual Tauri drag events for folder drop zone
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    console.log("🔧 Setting up FolderDropZone manual drag handlers");
    
    const win = getCurrentWindow();
    
    const unlistenPromise = win.onDragDropEvent(async (event) => {
      console.log("🎯 FolderDropZone Tauri event:", event.payload.type);
      
      // Check if drag is over our drop zone
      if ('position' in event.payload && event.payload.position) {
        const element = document.elementFromPoint(event.payload.position.x, event.payload.position.y);
        const isInDropZone = element?.closest('[data-folder-drop="true"]') === dropZone;
        
        if (!isInDropZone) return;
        
        console.log("🎯 FolderDropZone: Event is over our zone", event.payload.type);
        
        switch (event.payload.type) {
          case "enter":
            setIsDragOver(true);
            break;
          case "over":
            setIsDragOver(true);
            break;
          case "drop":
            setIsDragOver(false);
            const paths = event.payload.paths;
            console.log("🎯 FolderDropZone: Dropped paths:", paths);
            
            if (paths && paths.length > 0) {
              // Try to extract folder from first path
              const firstPath = paths[0];
              const lastSlashIndex = Math.max(firstPath.lastIndexOf('/'), firstPath.lastIndexOf('\\'));
              const folderPath = lastSlashIndex > 0 ? firstPath.substring(0, lastSlashIndex) : '';
              
              console.log("🎯 FolderDropZone: Extracted folder:", folderPath);
              
              if (folderPath) {
                onFolderSelected(folderPath);
              } else {
                // If it's just a single folder path, use it directly
                try {
                  const { lstat } = await import('@tauri-apps/plugin-fs');
                  const stats = await lstat(firstPath);
                  if (stats.isDirectory) {
                    console.log("🎯 FolderDropZone: Direct folder drop:", firstPath);
                    onFolderSelected(firstPath);
                  }
                } catch (error) {
                  console.error("🎯 FolderDropZone: Error checking directory:", error);
                }
              }
            }
            break;
        }
      }
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [onFolderSelected]);

  const handleButtonClick = useCallback(async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: "Select a folder for batch processing"
      });

      if (selectedPath && typeof selectedPath === 'string') {
        onFolderSelected(selectedPath);
      }
    } catch (error) {
      console.error("Failed to open folder dialog:", error);
    }
  }, [onFolderSelected]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log("📁 FolderDropZone onDrop called with", acceptedFiles.length, "files");
    
    if (acceptedFiles.length === 0) {
      console.warn("⚠️ No files accepted by react-dropzone");
      return;
    }

    // Try to extract folder path from any file
    for (const file of acceptedFiles) {
      console.log("🔍 Checking file:", file.name, "Path:", (file as any).path);
      
      if ((file as any).path) {
        // Extract the folder path from the file's path
        const filePath = (file as any).path;
        const lastSlashIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
        const folderPath = lastSlashIndex > 0 ? filePath.substring(0, lastSlashIndex) : '';
        
        console.log("✅ Extracted folder path:", folderPath);
        
        if (folderPath) {
          onFolderSelected(folderPath);
          return; // Success, exit early
        }
      }
    }
    
    console.error("❌ Could not extract folder path from any dropped file");
    console.log("🔍 Dropped files details:", acceptedFiles.map(f => ({ 
      name: f.name, 
      size: f.size, 
      type: f.type,
      path: (f as any).path,
      webkitRelativePath: (f as any).webkitRelativePath 
    })));
  }, [onFolderSelected]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    disabled,
    // Accept all file types - we'll filter manually
    accept: { '*/*': [] },
    onDragEnter: () => console.log("🎯 FolderDropZone: Drag enter"),
    onDragLeave: () => console.log("🎯 FolderDropZone: Drag leave"),
    onDragOver: (data) => console.log("🎯 FolderDropZone: Drag over", data),
    onDropAccepted: (files) => console.log("🎯 FolderDropZone: Drop accepted", files.length, "files"),
    onDropRejected: (rejections) => console.log("🎯 FolderDropZone: Drop rejected", rejections),
  });

  if (compact) {
    return (
      <div
        ref={dropZoneRef}
        {...getRootProps()}
        data-dropzone="folder"
        data-folder-drop="true"
        className={`
          border-2 border-dashed rounded-lg overflow-hidden cursor-pointer
          transition-all duration-200
          ${isDragOver
            ? "border-primary bg-primary/10 scale-[1.01]"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/20"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
        onClick={(e) => {
          // Prevent react-dropzone's click handling when we want to open the folder dialog
          e.stopPropagation();
          if (!disabled && !isDragOver) {
            handleButtonClick();
          }
        }}
      >
        <input {...getInputProps()} />
        <div className="flex items-center gap-3 p-3">
          {/* Left: Plus Icon */}
          <div className="flex-shrink-0 w-8 h-8 rounded bg-muted flex items-center justify-center">
            {isDragOver ? (
              <FolderOpen className="w-4 h-4 text-primary animate-bounce" />
            ) : (
              <Plus className="w-4 h-4 text-muted-foreground" />
            )}
          </div>

          {/* Middle: Text */}
          <div className="flex-1">
            {isDragOver ? (
              <p className="text-sm font-medium text-primary">Drop folder here</p>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">Add another folder</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      data-dropzone="folder"
      className={`
        flex justify-center items-center h-full min-h-[200px]
        border-2 border-dashed rounded-lg transition-all duration-200
        ${isDragOver
          ? "border-primary bg-primary/10 scale-[1.02]"
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        {isDragOver ? (
          <>
            <FolderOpen className="w-16 h-16 text-primary animate-bounce" />
            <div>
              <p className="text-lg font-semibold text-primary">
                Drop folder here
              </p>
              <p className="text-sm text-muted-foreground">
                Release to select this folder for batch processing
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="relative">
              <UploadIcon isHovered={isHovered && !disabled} />
            </div>
            <div>
              <p className="text-lg font-semibold mb-2">
                Add a Folder
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop a folder here or click to browse
              </p>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleButtonClick();
                }}
                variant={"ghost"}
                disabled={disabled}
                className="gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                Browse Folders
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};