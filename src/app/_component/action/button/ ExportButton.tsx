import { Button } from "@/components/ui/button";
import { useSettings } from "@/app/contexts/SettingsContext";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { exportToCSV } from "@/app/lib/exportUtils";

function ExportButton() {
  const { generated, categories } = useSettings();
  const [selectedPlatform, setSelectedPlatform] = useState<'adobeStock' | 'shutterStock'>('adobeStock');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (generated.items.length === 0) {
      toast.error("No metadata to export. Please generate metadata first.");
      return;
    }

    setIsExporting(true);
    try {
      await exportToCSV(generated.items, categories, selectedPlatform);
      toast.success(`Successfully exported ${generated.items.length} items to CSV!`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(`Export failed: ${error}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-full ">
      <Button
        variant={"ghost"}
        onClick={handleExport}
        disabled={isExporting || generated.items.length === 0}
      >
        {isExporting ? "Exporting..." : "Export"}
      </Button>
      <Separator orientation="vertical" />
      <div className="w-full flex justify-center items-center p-3">
        <Select value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as 'adobeStock' | 'shutterStock')}>
          <SelectTrigger className="w-full border text-center">
            <SelectValue placeholder="Select platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="adobeStock">Adobe Stock</SelectItem>
            <SelectItem value="shutterStock">Shutterstock</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default ExportButton;
