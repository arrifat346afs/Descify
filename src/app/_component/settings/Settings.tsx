import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ApiSettings from "./_component/ApiSettings";
import MetadataSettings from "./_component/MetadataSettings";
import { EmbedSettings } from "./_component/EmbedSettings";
import ApiKeyManagement from "./_component/ApiKeyManagement";
import ExportSettings from "./_component/ExportSettings";
import { useSettings } from "@/app/contexts/SettingsContext";
import { Settings as SettingsIcon, Key, FileText, Code, FileType2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { TemplateManager } from "./_component/TemplateManager";

const Settings = () => {
  const { settingsDialog } = useSettings();

  const menuItems = [
    { id: "models", label: "Model Selection", icon: SettingsIcon },
    { id: "apikeys", label: "API Keys", icon: Key },
    { id: "metadata", label: "Metadata", icon: FileText },
    { id: "embed", label: "Embed", icon: Code },
    { id: "export", label: "Export", icon: Download },
    { id: "templates", label: "Templates", icon: FileType2 },
  ];

  return (
    <div className="flex flex-col h-full w-full">
      <DialogHeader className="px-4 sm:px-6 pt-6 pb-4 shrink-0">
        <DialogTitle className="text-xl sm:text-2xl font-bold">Settings</DialogTitle>
      </DialogHeader>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 sm:w-56 md:w-64 border-r bg-muted/30 px-2 sm:px-3 py-4 overflow-y-auto shrink-0">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => settingsDialog.setDefaultTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 rounded-md text-xs sm:text-sm font-medium transition-colors",
                    settingsDialog.defaultTab === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-w-0">
          {settingsDialog.defaultTab === "models" && <ApiSettings />}
          {settingsDialog.defaultTab === "apikeys" && (
            <ApiKeyManagement compact={true} showTitle={false} />
          )}
          {settingsDialog.defaultTab === "metadata" && <MetadataSettings />}
          {settingsDialog.defaultTab === "embed" && <EmbedSettings />}
          {settingsDialog.defaultTab === "export" && <ExportSettings />}
          {settingsDialog.defaultTab === "templates" && <TemplateManager />}
        </div>
      </div>
    </div>
  );
};

export default Settings;
