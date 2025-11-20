
import { ActionsSection } from "./_component/action/ ActionsSection";
import { CategorySection } from "./_component/category/CategorySection";
import FileSection from "./_component/file-preview/FileSection";
import { MetadataSection } from "./_component/metadeta/MetadataSection";
import Navbar from "./_component/navigation/Navbar";
import { ProgressSection } from "./_component/progressbar/ProgressSection";
import ThumbnailSection from "./_component/thumbnail/ThumbnailSection";
import { useSettings } from "./contexts/SettingsContext"
import { Separator } from "@/components/ui/separator"
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";

import { LandingPage } from "./LandingPage";
import { LoadingPage } from "./LoadingPage";

export const Home = () => {
  const { selectedFile, setSelectedFile, setFiles, files, thumbnails, setHasAttemptedGeneration } = useSettings()
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFilesSelected = (files: File[]) => {
    setFiles(files);
  };

  // Drag and drop handler for main editor
  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log("🎁 Files dropped in main editor via react-dropzone!");
    console.log("   📦 Files received:", acceptedFiles.length);

    acceptedFiles.forEach((file, i) => {
      console.log(`      ${i + 1}. ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB)`);
    });

    // Filter for media files only
    const mediaFiles = acceptedFiles.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      return isImage || isVideo;
    });

    console.log("   🎬 Media files filtered:", mediaFiles.length);

    if (mediaFiles.length > 0) {
      // Append new files to existing files
      const updatedFiles = [...(files || []), ...mediaFiles];
      console.log("   🚀 Adding files to existing list. Total:", updatedFiles.length);
      setFiles(updatedFiles);
      setHasAttemptedGeneration(false);
    } else {
      console.log("   ⚠️ No valid media files found");
    }

    setIsDraggingOver(false);
  }, [files, setFiles, setHasAttemptedGeneration]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.webm']
    },
    multiple: true,
    noClick: true, // Disable click to open file dialog
    noKeyboard: true, // Disable keyboard interaction
    onDragEnter: () => {
      console.log("🎯 Drag enter main editor");
      setIsDraggingOver(true);
    },
    onDragLeave: () => {
      console.log("🚪 Drag leave main editor");
      setIsDraggingOver(false);
    },
  });

  console.log("🏠 HOME COMPONENT RENDER");
  console.log("   Files count:", files?.length || 0);
  console.log("   Thumbnails count:", thumbnails.items.length);
  console.log("   Is generating:", thumbnails.isGenerating);

  // 1. Landing Page: No files selected
  if (!files || files.length === 0) {
    console.log("   📄 Rendering: LANDING PAGE (no files)");
    return (
      <>
        <div className="h-[35px]">
          <Navbar />
        </div>
        <Separator />
        <LandingPage />
      </>
    );
  }

  // 2. Loading Page: Files selected but thumbnails are still generating
  // We check if we have files but not all thumbnails are ready yet
  const isGenerating = files.length > 0 && thumbnails.items.length < files.length;

  console.log("   🔄 Checking if generating:", {
    filesLength: files.length,
    thumbnailsLength: thumbnails.items.length,
    isGenerating,
  });

  if (isGenerating) {
    console.log("   ⏳ Rendering: LOADING PAGE (generating thumbnails)");
    return (
      <>
        <div className="h-[35px]">
          <Navbar />
        </div>
        <Separator />
        <LoadingPage />
      </>
    );
  }

  // 3. Main Editor: All thumbnails generated
  console.log("   ✅ Rendering: MAIN EDITOR (all thumbnails ready)");
  return (
    <div {...getRootProps()} className="min-h-screen flex flex-col m-0 p-0 relative">
      <input {...getInputProps()} />

      {/* Drag and Drop Overlay */}
      {(isDragActive || isDraggingOver) && (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-dashed border-primary animate-in fade-in duration-200">
          <Upload className="w-20 h-20 text-primary mb-4 animate-bounce" />
          <p className="text-2xl font-semibold text-primary">Drop files here to add them</p>
          <p className="text-sm text-muted-foreground mt-2">Images and videos will be added to your collection</p>
        </div>
      )}

      <div className="h-[35px]">
        <Navbar />
      </div>
      <Separator />
      <div className="flex h-[59vh] ">
        <div className="w-[30vw] h-full "><CategorySection /></div>
        <Separator orientation="vertical" />
        <div className="w-[40vw] h-full"><FileSection file={selectedFile} /></div>
        <Separator orientation="vertical" />
        <div className="w-[30vw] h-full"><MetadataSection /></div>
      </div>
      <Separator />
      <div className="flex flex-col h-[40vh]">
        <div className="h-[6vh] shrink-0 "><ActionsSection onFilesSelected={handleFilesSelected} /></div>
        <Separator />
        <div className="h-[29vh] w-full"><ThumbnailSection onSelectFile={setSelectedFile} /></div>
        <div className="h-[7vh] shrink-0 "><ProgressSection /></div>
      </div>
    </div>
  )
}
