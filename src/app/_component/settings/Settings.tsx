import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ApiSettings from "./_component/ApiSettings";
import MetadataSettings from "./_component/MetadataSettings";
import { EmbedSettings } from "./_component/EmbedSettings";
import ApiKeyManagement from "./_component/ApiKeyManagement";
import { useSettings } from "@/app/contexts/SettingsContext";

const Settings = () => {
  const { settingsDialog } = useSettings();

  return (
    <div className="flex flex-col h-full">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold">Settings</DialogTitle>
      </DialogHeader>
      <div className="flex-1 overflow-y-auto pt-4">
        <Tabs value={settingsDialog.defaultTab} onValueChange={settingsDialog.setDefaultTab} className="w-full">
          <TabsList className="grid h-11 w-full grid-cols-4 border bg-background/50">
            <TabsTrigger value="models">Model Selection</TabsTrigger>
            <TabsTrigger value="apikeys">API Keys</TabsTrigger>
            <TabsTrigger value="metadata">Metadata </TabsTrigger>
            <TabsTrigger value="embed">Embed </TabsTrigger>
          </TabsList>

          <TabsContent value="models" className="mt-6">
            <ApiSettings />
          </TabsContent>

          <TabsContent value="apikeys" className="mt-6">
            <ApiKeyManagement compact={true} showTitle={false} />
          </TabsContent>

          <TabsContent value="metadata" className="mt-6">
            <MetadataSettings />
          </TabsContent>

          <TabsContent value="embed" className="mt-6">
            <EmbedSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
