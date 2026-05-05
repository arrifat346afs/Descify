import { ActionsSection } from "./_component/action/ ActionsSection";
// import { CategorySection } from "./_component/category/CategorySection";
import FileSection from "./_component/file-preview/FileSection";
import { MetadataSection } from "./_component/metadeta/MetadataSection";
import { ProgressSection } from "./_component/progressbar/ProgressSection";
import ThumbnailSection from "./_component/thumbnail/ThumbnailSection";
import { useSettings } from "./contexts/SettingsContext";
import { Separator } from "@/components/ui/separator";

// import LeftTabs from "./_component/TabGroup/LeftTabs";
const PROGRESS_BAR_HEIGHT = 58; // px
export const Home = () => {
  const { selectedFile, setSelectedFile, setFiles } = useSettings();
  const handleFilesSelected = (files: File[]) => {
    setFiles(files);
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden select-none">
 
      {/* ── TOP SECTION: Preview (left) + Metadata (right) ── */}
      <div className="flex min-h-0" style={{ flex: "75 1 0%" }}>
 
        {/* Left: file preview */}
        <div className="h-full overflow-hidden" style={{ flex: "66 1 0%" }}>
          <FileSection file={selectedFile} />
        </div>
 
        <Separator orientation="vertical" />
 
        {/* Right: metadata panel — independently scrollable */}
        <div className="h-full overflow-y-auto" style={{ flex: "34 1 0%" }}>
          <MetadataSection />
        </div>
 
      </div>
 
      <Separator />
 
      {/* ── ACTION BAR: Upload / Generate / Cancel / Export ── */}
      <div
        className="w-full shrink-0"
        style={{ flex: "5 0 0%", minHeight: "40px", maxHeight: "60px" }}
      >
        <ActionsSection onFilesSelected={handleFilesSelected} />
      </div>
 
      <Separator />
 
      {/* ── BOTTOM SECTION: Thumbnails + Progress bar ── */}
      <div className="w-full flex flex-col" style={{ flex: "20 1 0%" }}>
 
        {/* Thumbnails — fill all space EXCEPT the progress bar */}
        <div
          className="w-full overflow-hidden"
          style={{ flex: "1 1 0%", minHeight: 0 }}
        >
          <ThumbnailSection onSelectFile={setSelectedFile} />
        </div>
 
        {/* ✅ Progress bar — fixed pixel height, NEVER collapses even if ProgressSection renders null */}
        <div
          className="w-full shrink-0"
          style={{ height: `${PROGRESS_BAR_HEIGHT}px` }}
        >
          <ProgressSection />
        </div>
 
      </div>
 
    </div>

  );
};
