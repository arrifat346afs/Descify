import { useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useSettings } from '@/app/contexts/SettingsContext';
import { generateMetadata } from '@/app/lib/ai';
import { getActiveTemplate } from '@/app/lib/templateUtils';
import { embedMetadata } from '@/app/lib/tauri-commands';
import { TextShimmer } from '@/components/motion-primitives/text-shimmer';
import { Sparkle } from 'lucide-react';

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
  const cancelRequestedRef = useRef(false);
  const pendingSelectionRef = useRef<File | null>(null);
  const selectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isGenerating = generationProgress.isGenerating;
  
  // Helper function to debounce file selection to avoid blocking during metadata updates
  const scheduleFileSelection = (file: File) => {
    // Store the file to select
    pendingSelectionRef.current = file;
    
    // Clear any pending selection timeout
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
    }
    
    // Schedule the selection with a small delay to batch it with metadata updates
    // This prevents the selection animation from blocking the metadata state updates
    selectionTimeoutRef.current = setTimeout(() => {
      if (pendingSelectionRef.current) {
        setSelectedFile(pendingSelectionRef.current);
        pendingSelectionRef.current = null;
      }
    }, 50);
  };

  // Reset auto-selection tracking and cancel flag when generation stops
  useEffect(() => {
    if (!isGenerating) {
      lastAutoSelectedIndexRef.current = -1;
      cancelRequestedRef.current = false;
      // Clean up pending selection on generation stop
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
        selectionTimeoutRef.current = null;
      }
    }
  }, [isGenerating]);

  // Sync the ref with the state when cancelRequested changes
  useEffect(() => {
    if (generationProgress.cancelRequested) {
      cancelRequestedRef.current = true;
    }
  }, [generationProgress.cancelRequested]);

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
      cancelRequested: false,
    });
    console.log(`✓ Starting metadata generation for ${items.length} files...`);
    console.log(`⏱️ Request delay: ${api.requestDelay}ms`);

    // Process each file one by one
    for (let i = 0; i < items.length; i++) {
      // Check if cancellation was requested
      if (cancelRequestedRef.current) {
        console.log('🛑 Generation cancelled by user');
        break;
      }

      const item = items[i];
      setGenerationProgress({
        currentIndex: i + 1,
        currentFileName: item.file.name,
      });
      console.log(`Generating metadata for file ${i + 1}/${items.length}: ${item.file.name}`);

      try {
        // Get custom instruction for this specific file
        const customInstruction = generated.getCustomInstruction(item.file);

        const result = await generateMetadata({
          file: item.file, // Use file directly for HQ AI image generation
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
          customInstruction: customInstruction,
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

        // Auto-select this file (debounced to avoid blocking metadata updates)
        console.log(`🎯 Scheduling file selection at index ${i}:`, item.file.name);
        scheduleFileSelection(item.file);
        lastAutoSelectedIndexRef.current = i;

        // Apply delay before next request (except for last item)
        // This prevents rate limiting and makes UI updates feel more controlled
        if (i < items.length - 1 && api.requestDelay > 0) {
          console.log(`⏱️ Waiting ${api.requestDelay}ms before next request...`);
          await new Promise(resolve => setTimeout(resolve, api.requestDelay));
        }

      } catch (error) {
        console.error(`❌ Failed to generate metadata for ${item.file.name}:`, error);

        // Don't store error messages as metadata - just log the error
        // The thumbnail will show a red border indicating generation was attempted but failed

        // Auto-select this file even on error so user can see which file failed (debounced)
        console.log(`🎯 Scheduling file selection at index ${i} (error case):`, item.file.name);
        scheduleFileSelection(item.file);
        lastAutoSelectedIndexRef.current = i;

        // Apply delay before next request even on error (except for last item)
        if (i < items.length - 1 && api.requestDelay > 0) {
          console.log(`⏱️ Waiting ${api.requestDelay}ms before next request (error case)...`);
          await new Promise(resolve => setTimeout(resolve, api.requestDelay));
        }
      }
    }

    const wasCancelled = generationProgress.cancelRequested;
    console.log(wasCancelled ? '🛑 Metadata generation cancelled!' : '✅ Metadata generation complete for all files!');
    setGenerationProgress({
      isGenerating: false,
      currentIndex: 0,
      currentFileName: '',
      totalFiles: 0,
      cancelRequested: false,
    });
  };

  const buttonText = thumbnails.isGenerating
    ? '⏳ Generating thumbnails...'
    : isGenerating
    ? <TextShimmer>Generating...</TextShimmer>
    : 'Generate';

  return (
    <Button
      onClick={handleGenerate}
      variant={"ghost"}
      disabled={thumbnails.isGenerating || isGenerating}
      className="gap-2 group"
    >
      <Sparkle
        className={`h-4 w-4 transition-all ${
          isGenerating
            ? 'animate-spin'
            : 'group-hover:scale-110 group-hover:rotate-12'
        }`}
      />
      {buttonText}
    </Button>
  );
};
{/* <Sparkle /> */}