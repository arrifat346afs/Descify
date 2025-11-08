import { Button } from "@/components/ui/button";
import { useSettings } from "@/app/contexts/SettingsContext";

function ExportButton() {
  const { generated } = useSettings();
  const handleExport = () => {
    console.log("Exporting metadata for", generated.getMetadata, "files");
  };
  return (
    <div>
      <Button
        className="bg-transparent text-white hover:bg-accent"
        onClick={handleExport}
      >
        Export
      </Button>
    </div>
  );
}

export default ExportButton;
