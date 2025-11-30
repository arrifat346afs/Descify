/**
 * TauriUploadButton Component
 * Uses Tauri's file dialog to get files with their paths for metadata operations
 */

import { Button } from "@/components/ui/button";
import { useSettings } from "@/app/contexts/SettingsContext";
import { selectFilesWithPaths, FileWithPath } from "@/app/lib/fileUtils";
import { useState } from "react";
import { Loader2, FolderOpen } from "lucide-react";

type TauriUploadButtonProps = {
  onFilesSelected?: (files: File[], filesWithPaths: FileWithPath[]) => void;
  variant?: "default" | "ghost" | "outline" | "secondary" | "destructive" | "link";
  showIcon?: boolean;
};

export function TauriUploadButton({ 
  onFilesSelected, 
  variant = "ghost",
  showIcon = false 
}: TauriUploadButtonProps) {
  const { setFiles, setHasAttemptedGeneration, embedded } = useSettings();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const filesWithPaths = await selectFilesWithPaths();
      
      if (filesWithPaths.length === 0) {
        console.log("No files selected");
        return;
      }

      // Extract File objects
      const files = filesWithPaths.map(f => f.file);
      
      // Set files in context
      setFiles(files);
      setHasAttemptedGeneration(false);
      
      // Store file paths for metadata operations
      filesWithPaths.forEach(({ file, filePath }) => {
        embedded.setFilePath(file, filePath);
      });

      console.log(`📁 Selected ${filesWithPaths.length} files with paths`);
      filesWithPaths.forEach((f, i) => {
        console.log(`   ${i + 1}. ${f.file.name} -> ${f.filePath}`);
      });

      // Call optional callback
      if (onFilesSelected) {
        onFilesSelected(files, filesWithPaths);
      }
    } catch (error) {
      console.error("Failed to select files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          {showIcon && <FolderOpen className="mr-2 h-4 w-4" />}
          Browse Files
        </>
      )}
    </Button>
  );
}

