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
      <div className="w-screen h-screen flex flex-col overflow-hidden select-none">
        {/* Main content */}
        <div className="flex" style={{ flex: "62 1 0%" }}>
          {/* Left (preview) */}
          <div className="h-full" style={{ flex: "66 1 0%" }}>
            <FileSection file={selectedFile} />
          </div>

          {/* Right (metadata) */}

          <div className="h-full" style={{ flex: "34 1 0%" }}>
            <MetadataSection />
          </div>
        </div>

        <Separator />
        <div
          className="w-full shrink-0 border-t border-b"
          style={{
            flex: "3 0 0%", // ~3% of viewport height
            minHeight: "20px", // never disappears on tiny screens
            maxHeight: "48px", // never gets too tall on 4K
          }}
        >
          <ActionsSection onFilesSelected={handleFilesSelected} />
        </div>
        {/* Bottom section */}
        <div className="w-full" style={{ flex: "26 1 0%" }}>
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
