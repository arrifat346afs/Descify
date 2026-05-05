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
      <div className="flex flex-col ">
        {/* Main content */}
        <div className="grid grid-cols-3 grid-rows-1 gap-0  bg-red-700">
          <Separator orientation="vertical" />

          {/* Left (preview) */}
          <div className="col-span-2">
            <FileSection file={selectedFile} />
          </div>


          {/* Right (metadata) */}
          <Separator orientation="vertical" />
          <div className="">
            <MetadataSection />
          </div>
        </div>

        <Separator />

        {/* Bottom section */}
        <div className="bg-blue-700">
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
