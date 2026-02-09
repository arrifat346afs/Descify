import { Button } from "@/components/ui/button";
import { useSettings } from "@/app/contexts/SettingsContext";
import { useState } from "react";
import React from "react";
import { toast } from "sonner";
import { exportToMultipleFormats } from "@/app/lib/exportUtils";
// import { Download } from "lucide-react";
import { DownloadIcon } from "@/components/ui/download";

function ExportButtonComponent() {
  const { generated, categories, exportSettings } = useSettings();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (generated.items.length === 0) {
      toast.error("No metadata to export. Please generate metadata first.");
      return;
    }

    const selectedFormats = Object.entries(exportSettings)
      .filter(([_, enabled]) => enabled)
      .map(([format]) => format as 'adobeStock' | 'shutterStock');

    if (selectedFormats.length === 0) {
      toast.error("No export formats selected. Please select formats in Settings > Export.");
      return;
    }

    setIsExporting(true);
    try {
      await exportToMultipleFormats(generated.items, categories, selectedFormats);
      const formatNames = selectedFormats.map(format => 
        format === 'adobeStock' ? 'Adobe Stock' : 'Shutterstock'
      ).join(', ');
      toast.success(`Successfully exported ${generated.items.length} items to ${formatNames}!`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(`Export failed: ${error}`);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFormatsCount = Object.values(exportSettings).filter(Boolean).length;
  const tooltipText = selectedFormatsCount > 0 
    ? `Export ${selectedFormatsCount} format${selectedFormatsCount > 1 ? 's' : ''}`
    : 'No formats selected (configure in Settings)';

  return (
    <div className="flex justify-center items-center h-full">
      <Button
        variant="ghost"
        onClick={handleExport}
        disabled={isExporting || generated.items.length === 0 || selectedFormatsCount === 0}
        className="gap-2 group"
        title={tooltipText}
      >
        <DownloadIcon/>
        {selectedFormatsCount > 0 && (
          <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
            {selectedFormatsCount}
          </span>
        )}
      </Button>
    </div>
  );
}

const ExportButton = React.memo(ExportButtonComponent);
export default ExportButton;
