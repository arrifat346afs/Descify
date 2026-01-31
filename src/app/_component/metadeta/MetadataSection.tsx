import TitleField from "./metadata-fields/TitleField";
import { DescriptionField } from "./metadata-fields/DescriptionField";
import KeywordsField from "./metadata-fields/KeywordsField";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useSettings } from '@/app/contexts/SettingsContext';
import { generateMetadata } from '@/app/lib/ai';
import { embedMetadata } from '@/app/lib/tauri-commands';
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export const MetadataSection = () => {
  const { selectedFile, thumbnails, api, metadataLimits, metadataOptions, generated, getFilePath, templateSettings } = useSettings();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    if (!selectedFile) return;

    const thumbnailItem = thumbnails.items.find(t => t.file === selectedFile);
    if (!thumbnailItem) {
      alert("Thumbnail not ready yet. Please wait.");
      return;
    }

    const model = api.selectedModel || undefined;
    const provider = api.selectedProvider || undefined;
    const apiKey = provider ? api.apiKeys[provider] : undefined;

    if (!apiKey) {
      alert('Please configure your API key in Settings');
      return;
    }

    // Get custom instruction for this file
    const customInstruction = generated.getCustomInstruction(selectedFile);

    // Get active custom template if one is selected
    const activeTemplate = templateSettings.activeTemplateId
      ? templateSettings.userTemplates.find(t => t.id === templateSettings.activeTemplateId)
      : null;
    const customTemplate = activeTemplate?.template;

    setIsGenerating(true);
    try {
      const result = await generateMetadata({
        file: selectedFile, // Use file directly for HQ AI image generation
        fileNames: [selectedFile.name],
        provider,
        model,
        apiKey,
        limits: {
          titleLimit: metadataLimits.titleLimit,
          descriptionLimit: metadataLimits.descriptionLimit,
          keywordLimit: metadataLimits.keywordLimit,
        },
        includePlaceName: metadataOptions.includePlaceName,
        customTemplate: customTemplate,
        customInstruction: customInstruction,
        avoidWords: {
          titleAvoidWords: metadataOptions.titleAvoidWords,
          keywordsAvoidWords: metadataOptions.keywordsAvoidWords,
          descriptionAvoidWords: metadataOptions.descriptionAvoidWords,
        },
      });

      generated.setMetadata(selectedFile, {
        title: result.title,
        description: result.description,
        keywords: result.keywords,
      });
    } catch (error) {
      console.error("Failed to generate metadata:", error);
      alert("Failed to generate metadata. Check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) {
      toast.error("No file selected");
      return;
    }

    const filePath = getFilePath(selectedFile);
    if (!filePath) {
      toast.error("File path not found. Please re-upload the file.");
      return;
    }

    const metadata = generated.getMetadata(selectedFile);
    if (!metadata) {
      toast.error("No metadata to save");
      return;
    }

    setIsSaving(true);
    try {
      console.log(`💾 Saving metadata for ${selectedFile.name}...`);

      const embedRequest = {
        file_path: filePath,
        title: metadata.title || undefined,
        description: metadata.description || undefined,
        keywords: metadata.keywords || undefined,
      };

      const result = await embedMetadata(embedRequest);

      if (result.success) {
        console.log(`✅ Successfully saved metadata: ${result.message}`);
        toast.success(`Metadata saved to ${selectedFile.name}`);
      } else {
        console.error(`❌ Failed to save metadata: ${result.message}`);
        toast.error(`Failed to save: ${result.message}`);
      }
    } catch (error) {
      console.error("Error saving metadata:", error);
      toast.error("An error occurred while saving metadata");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollArea className="h-full w-full">
      <div className="flex flex-col gap-4 p-2 h-full">
        <TitleField />
        <DescriptionField />
        <KeywordsField />

        <div className="flex gap-2 mt-2">
          <Button
            onClick={handleGenerate}
            disabled={!selectedFile || isGenerating}
            className="flex-1"
            variant="outline"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate"
            )}
          </Button>

          <Button
            onClick={handleSave}
            disabled={!selectedFile || isSaving}
            className="flex-1"
            variant="default"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
};
