import { Button } from "@/components/ui/button";
import { useSettings } from "@/app/contexts/SettingsContext";
import { X } from "lucide-react";
import React from "react";

const CancelButtonComponent = () => {
  const { generationProgress, setGenerationProgress } = useSettings();
  const isGenerating = generationProgress.isGenerating;

  const handleCancel = () => {
    console.log('🛑 Cancel requested from CancelButton');
    setGenerationProgress({ cancelRequested: true });
  };

  return (
    <Button
      onClick={handleCancel}
      variant="ghost"
      className="gap-2 group"
      disabled={!isGenerating}
    >
      <X className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:rotate-90" />
      Cancel
    </Button>
  );
};

export const CancelButton = React.memo(CancelButtonComponent);

