import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useSettings } from '@/app/contexts/SettingsContext'
import { readFile } from '@tauri-apps/plugin-fs';
import * as path from '@tauri-apps/api/path';

const MetadataSettings = () => {
  const { metadataLimits, metadataOptions } = useSettings();

  const handleReset = () => {
    metadataLimits.setLimits({
      titleLimit: 200,
      descriptionLimit: 200,
      keywordLimit: 80,
    });
  };
  const handleFileSelect = () => {
    // Implement file selection logic here
    try {
      console.log('File select clicked');
      openPath('/');
    } catch (error) {
      console.error('Failed to open path:', error);
    }
  };

  return (
     <div className="flex flex-col items-center gap-6 text-gray-400">
      {/* <h2 className="text-2xl font-bold text-gray-400">Metadata Settings</h2> */}
      <div className="w-full max-w-md flex flex-col gap-4">
        <div>
          <div className="flex gap-3 p-2">
            <h4>Title Limit</h4>
            <span className="text-xs text-gray-500">(characters)</span>
          </div>
          <Input
            className="border-background/20"
            type="number"
            value={metadataLimits.titleLimit}
            onChange={(e) =>
              metadataLimits.setLimits({ titleLimit: parseInt(e.target.value || '1') })
            }
            min={1}
            placeholder="e.g., 200"
          />
        </div>
        <div>
          <div className="flex gap-3 p-2">
            <h4>Description Limit</h4>
            <span className="text-xs text-gray-500">(characters)</span>
          </div>
          <Input
            className="border-background/20"
            type="number"
            value={metadataLimits.descriptionLimit}
            onChange={(e) => metadataLimits.setLimits({ descriptionLimit: parseInt(e.target.value || '1') })}
            min={1}
            placeholder="e.g., 200"
          />
        </div>
        <div>
          <div className="flex gap-3 p-2">
            <h4>Keyword Limit</h4>
            <span className="text-xs text-gray-500">(number of keywords)</span>
          </div>
          <Input
            className="border-background/20"
            type="number"
            value={metadataLimits.keywordLimit}
            onChange={(e) => metadataLimits.setLimits({ keywordLimit: parseInt(e.target.value || '1') })}
            min={1}
            placeholder="e.g., 80"
          />
        </div>
        <div className="flex w-full justify-between gap-4">
          <Button className="flex-1" variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
        </div>
        <div className="text-xs text-gray-500 text-center">
          Current: Title={metadataLimits.titleLimit}, Description={metadataLimits.descriptionLimit}, Keywords={metadataLimits.keywordLimit}
        </div>
        <div className="flex flex-col gap-2">
          <h4 className="p-2">Select Output Directory</h4>
          <div className="flex gap-2">
            <Input
              className="border-background/20 grow"
              type="text"
              // value={selectedFilePath}
              readOnly
              placeholder="No directory selected"
            />
            <Button
              variant="outline"
              className="w-30"
              onClick={handleFileSelect}
            >
              Browse
            </Button>
          </div>
        </div>
        <div className="flex justify-between items-center p-2">
          <div className="flex flex-col gap-1">
            <h4>Include Place Names</h4>
            <span className="text-xs text-gray-500">
              {metadataOptions.includePlaceName
                ? "AI will include location/place names in metadata"
                : "AI will exclude location/place names from metadata"}
            </span>
          </div>
          <Switch
            checked={metadataOptions.includePlaceName}
            onCheckedChange={(checked) =>
              metadataOptions.setOptions({ includePlaceName: checked })
            }
          />
        </div>
      </div>
    </div>
  )
}

export default MetadataSettings