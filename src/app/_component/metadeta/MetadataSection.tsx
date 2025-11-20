import TitleField from "./metadata-fields/TitleField";
import { DescriptionField } from "./metadata-fields/DescriptionField";
import KeywordsField from "./metadata-fields/KeywordsField";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useSettings } from '@/app/contexts/SettingsContext';
import { generateMetadata } from '@/app/lib/ai';
import { useState } from "react";
import { Loader2 } from "lucide-react";

export const MetadataSection = () => {
  const { selectedFile, thumbnails, api, metadataLimits, metadataOptions, generated } = useSettings();
  const [isGenerating, setIsGenerating] = useState(false);

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

    setIsGenerating(true);
    try {
      const result = await generateMetadata({
        thumbnailUrls: [thumbnailItem.thumbnailUrl],
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

  return (
    <ScrollArea >
      <div className="flex flex-col gap-4 p-2">
        <TitleField />
        <DescriptionField />
        <KeywordsField />

        <Button
          onClick={handleGenerate}
          disabled={!selectedFile || isGenerating}
          className="w-full mt-2"
          variant="outline"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Metadata for this File"
          )}
        </Button>
      </div>
    </ScrollArea>
  );
};
