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
        // ✅ No outer wrapper — this IS the root. h-screen fills the window.
    <div className="w-screen h-screen flex flex-col overflow-hidden select-none">
 
      {/* ── TOP SECTION: Preview (left) + Metadata (right) ── ~75% of height */}
      <div className="flex min-h-0" style={{ flex: "75 1 0%" }}>
 
        {/* Left: file preview — 66% of width */}
        <div className="h-full overflow-hidden" style={{ flex: "66 1 0%" }}>
          <FileSection file={selectedFile} />
        </div>
 
        {/* Vertical divider */}
        <Separator orientation="vertical" />
 
        {/* Right: metadata panel — 34% of width, scrollable */}
        <div className="h-full overflow-y-auto" style={{ flex: "34 1 0%" }}>
          <MetadataSection />
        </div>
 
      </div>
 
      {/* ── ACTION BAR SEPARATOR ── */}
      <Separator />
 
      {/* ── ACTION BAR: Upload / Generate / Cancel / Export ── ~5% of height */}
      <div
        className="w-full shrink-0 flex"
        style={{
          flex: "5 0 0%",
          minHeight: "36px",
          maxHeight: "60px",
        }}
      >
        <ActionsSection onFilesSelected={handleFilesSelected} />
      </div>
 
      {/* ── BOTTOM SECTION SEPARATOR ── */}
      <Separator />
 
      {/* ── BOTTOM SECTION: Thumbnails + Progress ── ~20% of height */}
      <div
        className="w-full flex flex-col"
        style={{ flex: "20 1 0%" }}
      >
        <div className="flex-1 min-h-0 overflow-hidden">
          <ThumbnailSection onSelectFile={setSelectedFile} />
        </div>
        <ProgressSection />
      </div>
 
    </div>

  );
};
