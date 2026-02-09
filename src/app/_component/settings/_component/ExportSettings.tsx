import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettings } from "@/app/contexts/SettingsContext";

const ExportSettings = () => {
  const { exportSettings } = useSettings();

  const handleExportToggle = (format: keyof typeof exportSettings, checked: boolean) => {
    exportSettings.setExportSettings({ [format]: checked });
  };

  const exportFormats = [
    {
      key: 'adobeStock' as const,
      title: 'Adobe Stock',
      description: 'Export metadata in Adobe Stock CSV format with single category column',
    },
    {
      key: 'shutterStock' as const,
      title: 'Shutterstock',
      description: 'Export metadata in Shutterstock CSV format with two category columns',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Export Settings</h3>
        <p className="text-sm text-muted-foreground">
          Choose which export formats to generate. When exporting, all selected formats will be created as separate CSV files.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Formats</CardTitle>
          <CardDescription>
            Select the formats you want to include when exporting metadata. Multiple formats can be selected and will be generated simultaneously.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {exportFormats.map((format) => (
            <div key={format.key} className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1">
                <Label htmlFor={format.key} className="font-medium">
                  {format.title}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {format.description}
                </p>
              </div>
              <Switch
                id={format.key}
                checked={exportSettings[format.key]}
                onCheckedChange={(checked) => handleExportToggle(format.key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="rounded-lg border p-4 bg-muted/50">
        <h4 className="font-medium mb-2">Export Behavior</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• All selected formats will be generated in a single export action</li>
          <li>• Each format creates its own CSV file with appropriate naming</li>
          <li>• Files are saved to your chosen export location</li>
          <li>• Format selection is preserved for future exports</li>
        </ul>
      </div>
    </div>
  );
};

export default ExportSettings;