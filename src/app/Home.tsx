
import { ActionsSection } from "./_component/action/ ActionsSection";
import { CategorySection } from "./_component/category/CategorySection";
import FileSection from "./_component/file-preview/FileSection";
import { MetadataSection } from "./_component/metadeta/MetadataSection";
import Navbar from "./_component/navigation/Navbar";
import { ProgressSection } from "./_component/progressbar/ProgressSection";
import ThumbnailSection from "./_component/thumbnail/ThumbnailSection";
import { useSettings } from "./contexts/SettingsContext"
import { Separator } from "@/components/ui/separator"


import { LandingPage } from "./LandingPage";
import { LoadingPage } from "./LoadingPage";

export const Home = () => {
  const { selectedFile, setSelectedFile, setFiles, files, thumbnails } = useSettings()

  const handleFilesSelected = (files: File[]) => {
    setFiles(files);
  };

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
    <div className="min-h-screen flex flex-col m-0 p-0">
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
