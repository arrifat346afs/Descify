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
  const { selectedFile, setSelectedFile, setFiles } = useSettings();
  const handleFilesSelected = (files: File[]) => {
    setFiles(files);
  };

  return (
    <div>
      <Separator />
      <div className="grid grid-cols-3 grid-rows-1 gap-0 ">
        {/* Main content */}
       
          {/* Left (preview) */}
          <div className="col-span-2">
            <FileSection file={selectedFile} />
          </div>

          {/* Right (metadata) */}
          <div className="col-start-3">
            <Separator orientation="vertical" />
            <MetadataSection />
          </div>



        {/* Bottom section */}
        <div className="col-span-3 row-start-2 ">
          <Separator />
          <ActionsSection onFilesSelected={handleFilesSelected} />
          <Separator />
          <div className="">
            <ThumbnailSection onSelectFile={setSelectedFile} />
          </div>
          <ProgressSection />
        </div>
      </div>
    </div>
  );
};
