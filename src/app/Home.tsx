import { ActionsSection } from "./_component/action/ ActionsSection";
// import { CategorySection } from "./_component/category/CategorySection";
import FileSection from "./_component/file-preview/FileSection";
import { MetadataSection } from "./_component/metadeta/MetadataSection";
import { ProgressSection } from "./_component/progressbar/ProgressSection";
import ThumbnailSection from "./_component/thumbnail/ThumbnailSection";
import { useSettings } from "./contexts/SettingsContext";
import { Separator } from "@/components/ui/separator";



// import LeftTabs from "./_component/TabGroup/LeftTabs";

export const Home = () => {
  const {
    selectedFile,
    setSelectedFile,
    setFiles,
  } = useSettings();
  const handleFilesSelected = (files: File[]) => {
    setFiles(files);
  };


  return (
<div className="min-h-screen flex flex-col">
  <Separator />

  {/* Main content */}
  <div className="flex flex-1 min-h-0">
    <Separator orientation="vertical" />

    {/* Left (preview) */}
    <div className="flex-2 min-w-0">
      <FileSection file={selectedFile} />
    </div>

    <Separator orientation="vertical" />

    {/* Right (metadata) */}
    <div className="flex-1 min-w-[280px] max-w-[500px]">
      <MetadataSection />
    </div>
  </div>

  <Separator />

  {/* Bottom section */}
  <div className="flex flex-col shrink-0">
    <ActionsSection onFilesSelected={handleFilesSelected} />
    <Separator />
    <div className="w-full overflow-x-auto">
      <ThumbnailSection onSelectFile={setSelectedFile} />
    </div>
    <ProgressSection />
  </div>
</div>
  );
};
