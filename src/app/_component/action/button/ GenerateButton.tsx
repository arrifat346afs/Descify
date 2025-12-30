import { useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useSettings } from '@/app/contexts/SettingsContext';
import { generateMetadata } from '@/app/lib/ai';
import { getActiveTemplate } from '@/app/lib/templateUtils';
import { embedMetadata } from '@/app/lib/tauri-commands';
import { TextShimmer } from '@/components/motion-primitives/text-shimmer';

export const GenerateButton = () => {
  const { 
    files, 
    thumbnails, 
    api, 
    metadataLimits, 
    metadataOptions, 
    templateSettings,
    embedSettings,
    generated, 
    setHasAttemptedGeneration, 
    setSelectedFile, 
    generationProgress, 
    setGenerationProgress,
    getFilePath 
  } = useSettings();

  // Get the active template
  const activeTemplate = getActiveTemplate(
    templateSettings.activeTemplateId,
    templateSettings.userTemplates
  );
  const lastAutoSelectedIndexRef = useRef(-1);
  const isGenerating = generationProgress.isGenerating;

  // Reset auto-selection tracking when generation stops
  useEffect(() => {
    if (!isGenerating) {
      lastAutoSelectedIndexRef.current = -1;
    }
  }, [isGenerating]);

  const handleGenerate = async () => {
    console.log('=== Generate Button Clicked ===');
    console.log('Files in context:', files.length);
    console.log('Thumbnails context:', thumbnails);
    console.log('Thumbnails.items length:', thumbnails.items?.length);
    console.log('Is generating thumbnails:', thumbnails.isGenerating);

    // Mark that user has attempted to generate metadata
    setHasAttemptedGeneration(true);

    if (thumbnails.isGenerating) {
      alert('Please wait for thumbnails to finish generating...');
      return;
    }

    if (isGenerating) {
      alert('Already generating metadata...');
      return;
    }

    if (!thumbnails.items || thumbnails.items.length === 0) {
      // nothing to generate from
      console.error('❌ No thumbnails to generate metadata for');
      console.log('Thumbnails.items:', thumbnails.items);
      alert('No thumbnails found. Please upload images/videos first.');
      return;
    }

    // Sort thumbnails by the original file order
    // This ensures we process files in the same order they appear in the UI
    const sortedItems = files
      .map(file => thumbnails.items.find(item => item.file === file))
      .filter((item): item is NonNullable<typeof item> => item !== undefined);

    console.log('📋 Original files order:', files.map(f => f.name));
    console.log('📋 Sorted thumbnails order:', sortedItems.map(item => item.file.name));
    console.log('📋 Processing', sortedItems.length, 'files in sequential order');

    const items = sortedItems;

    const model = api.selectedModel || undefined;
    const provider = api.selectedProvider || undefined;
    const apiKey = provider ? api.apiKeys[provider] : undefined;

    console.log('Provider:', provider);
    console.log('Model:', model);
    console.log('API Key exists:', !!apiKey);

    if (!apiKey) {
      console.error('No API key configured for provider:', provider);
      alert('Please configure your API key in Settings');
      return;
    }

    setGenerationProgress({
      isGenerating: true,
      currentIndex: 0,
      currentFileName: '',
      totalFiles: items.length,
    });
    console.log(`✓ Starting metadata generation for ${items.length} files...`);
    console.log(`⏱️ Request delay: ${api.requestDelay}ms`);

    // Process each file one by one
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setGenerationProgress({
        currentIndex: i + 1,
        currentFileName: item.file.name,
      });
      console.log(`Generating metadata for file ${i + 1}/${items.length}: ${item.file.name}`);

      try {
        const result = await generateMetadata({
          thumbnailUrls: [item.thumbnailUrl],
          fileNames: [item.file.name],
          provider,
          model,
          apiKey,
          limits: {
            titleLimit: metadataLimits.titleLimit,
            descriptionLimit: metadataLimits.descriptionLimit,
            keywordLimit: metadataLimits.keywordLimit,
          },
          includePlaceName: metadataOptions.includePlaceName,
          customTemplate: activeTemplate || undefined,
        });

        // Store metadata for this specific file
        console.log(`📝 Setting metadata for file at index ${i}:`, item.file.name);
        generated.setMetadata(item.file, {
          title: result.title,
          description: result.description,
          keywords: result.keywords,
        });

        console.log(`✓ Generated metadata for ${item.file.name} (index ${i})`);
        console.log(`📊 Total generated items now:`, generated.items.length);

        // Embed metadata into file if enabled
        if (embedSettings.enabled) {
          const filePath = getFilePath(item.file);
          if (filePath) {
            try {
              console.log(`🔧 Embedding metadata for ${item.file.name}...`);
              
              const embedRequest = {
                file_path: filePath,
                title: embedSettings.fields.title ? result.title : undefined,
                description: embedSettings.fields.description ? result.description : undefined,
                keywords: embedSettings.fields.keywords ? result.keywords : undefined,
              };

              const embedResult = await embedMetadata(embedRequest);
              
              if (embedResult.success) {
                console.log(`✅ Successfully embedded metadata for ${item.file.name}: ${embedResult.message}`);
              } else {
                console.warn(`⚠️ Failed to embed metadata for ${item.file.name}: ${embedResult.message}`);
              }
            } catch (error) {
              console.error(`❌ Error embedding metadata for ${item.file.name}:`, error);
            }
          } else {
            console.warn(`⚠️ No file path found for ${item.file.name}, skipping metadata embedding`);
          }
        } else {
          console.log(`⏭️ Metadata embedding disabled, skipping for ${item.file.name}`);
        }

        // Auto-select this file immediately after generating its metadata
        console.log(`🎯 Auto-selecting file at index ${i}:`, item.file.name);
        setSelectedFile(item.file);
        lastAutoSelectedIndexRef.current = i;

        // Apply delay before next request (except for last item)
        // This prevents rate limiting and makes UI updates feel more controlled
        if (i < items.length - 1 && api.requestDelay > 0) {
          console.log(`⏱️ Waiting ${api.requestDelay}ms before next request...`);
          await new Promise(resolve => setTimeout(resolve, api.requestDelay));
        }

      } catch (error) {
        console.error(`Failed to generate metadata for ${item.file.name}:`, error);
        // Store error state
        generated.setMetadata(item.file, {
          title: 'Error generating title',
          description: `Failed to generate: ${error}`,
          keywords: 'error',
        });

        // Auto-select this file even on error
        console.log(`🎯 Auto-selecting file at index ${i} (error case):`, item.file.name);
        setSelectedFile(item.file);
        lastAutoSelectedIndexRef.current = i;

        // Apply delay before next request even on error (except for last item)
        if (i < items.length - 1 && api.requestDelay > 0) {
          console.log(`⏱️ Waiting ${api.requestDelay}ms before next request (error case)...`);
          await new Promise(resolve => setTimeout(resolve, api.requestDelay));
        }
      }
    }

    console.log('Metadata generation complete for all files!');
    setGenerationProgress({
      isGenerating: false,
      currentIndex: 0,
      currentFileName: '',
      totalFiles: 0,
    });
  };

  const buttonText = thumbnails.isGenerating
    ? '⏳ Generating thumbnails...'
    : isGenerating
    ? <TextShimmer>Generating...</TextShimmer>
    : 'Generate';

  return (
    <div>
      <Button
        onClick={handleGenerate}
        variant={"ghost"}
        disabled={thumbnails.isGenerating || isGenerating}
      >
        {buttonText}
      </Button>
    </div>
  );
};
