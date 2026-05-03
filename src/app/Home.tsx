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
    <div className="min-h-screen flex flex-col m-0 p-0 relative">
      <Separator />
      <div className="flex h-[65vh] ">
        <Separator orientation="vertical" />
        <div className="w-[40vw] h-full">
          <FileSection file={selectedFile} />
        </div>
        <Separator orientation="vertical" />
        <div className="w-[30vw] h-full p-2 mt-5">
          <MetadataSection />
        </div>
      </div>
      <Separator />
      <div className="flex flex-col ">
        <div className="shrink-0 ">
          <ActionsSection onFilesSelected={handleFilesSelected} />
        </div>
        <Separator />
        <div className="pb-2 w-full">
          <ThumbnailSection onSelectFile={setSelectedFile} />
        </div>
        <div className="shrink-0 ">
          <ProgressSection />
        </div>
      </div>
    </div>
  );
};
