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
    <div className="w-screen h-screen flex flex-col overflow-hidden select-none">
      {/* ── TOP SECTION: Preview (left) + Metadata (right) ── */}
      <div className="flex min-h-0" style={{ flex: "75 1 0%" }}>
        {/* Left: file preview */}
        <div className="h-full overflow-hidden" style={{ flex: "66 1 0%" }}>
          <FileSection file={selectedFile} />
        </div>

        <Separator orientation="vertical" />

        {/* Right: metadata panel — scrollable */}
        <div className="h-full overflow-y-auto" style={{ flex: "34 1 0%" }}>
          <MetadataSection />
        </div>
      </div>

      <Separator />

      {/* ── ACTION BAR: Upload / Generate / Cancel / Export ── */}
      {/* ✅ No flex wrapper — let ActionsSection control its own layout */}
      <div
        className="w-full shrink-0"
        style={{
          flex: "5 0 0%",
          minHeight: "40px",
          maxHeight: "60px",
        }}
      >
        <ActionsSection onFilesSelected={handleFilesSelected} />
      </div>

      <Separator />

      {/* ── BOTTOM SECTION: Thumbnails + Progress bar ── */}
      <div className="w-full flex flex-col" style={{ flex: "20 1 0%" }}>
        {/* Thumbnails fill all available space */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ThumbnailSection onSelectFile={setSelectedFile} />
        </div>

        {/* ✅ Progress bar: shrink-0 guarantees it is never squeezed to zero */}
        <div className="shrink-0" style={{ minHeight: "24px" }}>
          <ProgressSection />
        </div>
      </div>
    </div>
  );
};
