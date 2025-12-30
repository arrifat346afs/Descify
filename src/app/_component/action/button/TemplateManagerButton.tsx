import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { TemplateDialog } from "./TemplateDialog";
import { useSettings } from '@/app/contexts/SettingsContext';
import { DEFAULT_TEMPLATES } from '@/app/lib/templateUtils';

export const TemplateManagerButton = () => {
  const { templateSettings } = useSettings();
  
  const getActiveTemplateName = () => {
    if (!templateSettings.activeTemplateId) {
      return 'Default';
    }
    
    const userTemplate = templateSettings.userTemplates.find(t => t.id === templateSettings.activeTemplateId);
    if (userTemplate) {
      return userTemplate.name;
    }
    
    const presetTemplate = DEFAULT_TEMPLATES.find(t => t.id === templateSettings.activeTemplateId);
    if (presetTemplate) {
      return presetTemplate.name;
    }
    
    return 'Default';
  };

  const activeTemplateName = getActiveTemplateName();
  const isCustomActive = templateSettings.activeTemplateId !== null;

  return (
    <TemplateDialog>
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <Settings className="h-4 w-4" />
        <span className="hidden sm:inline">Templates</span>
        {isCustomActive && (
          <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
            {activeTemplateName}
          </span>
        )}
      </Button>
    </TemplateDialog>
  );
};