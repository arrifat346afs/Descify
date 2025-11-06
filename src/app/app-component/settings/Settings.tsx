import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ApiSettings from "./_component/ApiSettings";
import MetadataSettings from "./_component/MetadataSettings";

const Settings = () => {
  return (
    <div className="flex flex-col h-full">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold">Settings</DialogTitle>
      </DialogHeader>
      <div className="flex-1 overflow-y-auto pt-4">
        <Tabs defaultValue="api" className="w-full">
          <TabsList className="grid h-11 w-full grid-cols-2 border bg-background/50">
            <TabsTrigger value="api">API Settings</TabsTrigger>
            <TabsTrigger value="metadata">Metadata Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="mt-6">
            <ApiSettings />
          </TabsContent>

          <TabsContent value="metadata">
            <MetadataSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
