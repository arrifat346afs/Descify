import { useState, useCallback } from "react";
import { useSettings } from "@/app/contexts/SettingsContext";
import { useAppSelector } from "@/store/hooks";
import { FolderDropZone } from "./FolderDropZone";
import { FolderInfoCard, type FolderInfo } from "./FolderInfoCard";
import { thumbnailCache, type CachedFolder } from "./ThumbnailCache";
import { readFile, exists, readDir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { startBatchProcessing } from "@/app/lib/batchProcessor";

// Helper to get MIME type from file extension (reused from UploadButton)
const getMimeType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'svg': 'image/svg+xml',
    // Videos
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'webm': 'video/webm',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    'flv': 'video/x-flv',
    'wmv': 'video/x-ms-wmv',
    'm4v': 'video/x-m4v',
    '3gp': 'video/3gpp',
    'ogv': 'video/ogg',
    'mts': 'video/mp2t',
    'm2ts': 'video/mp2t',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

// Convert a file path to a File object with proper MIME type
const fileFromPath = async (path: string): Promise<File> => {
  const data = await readFile(path);
  // Handle both forward and backward slashes for cross-platform compatibility
  const name = path.split(/[/\\]/).pop() ?? "file";
  const mimeType = getMimeType(name);
  console.log(`🔍 BatchProcessor fileFromPath: ${name} -> MIME type: ${mimeType}`);
  return new File([data], name, { type: mimeType });
};

export const BatchProsess = () => {
  const {
    setFiles,
    thumbnails,
    generated,
    setSelectedFile,
    setHasAttemptedGeneration,
    setFilePath,
    getFilePath,
    templateSettings,
    batchFolders,
    addBatchFolder,
    updateBatchFolder,
    removeBatchFolder,
    api,
    metadataLimits,
    metadataOptions,
    embedSettings,
    categories,
    settingsDialog,
  } = useSettings();

  // State management - cached folders for thumbnails (local cache, not persisted)
  const [cachedFolders, setCachedFolders] = useState<Map<string, CachedFolder>>(new Map());
  
  // Get batch processing state from Redux
  const batchProcess = useAppSelector((state) => state.batchProcess);
  const isProcessing = batchProcess.isProcessing;

  // Scan folder for media files
  const scanFolder = useCallback(async (folderPath: string): Promise<File[]> => {
    try {
      const entries = await readDir(folderPath);
      
      const supportedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg', 'mp4', 'mov', 'webm', 'avi', 'mkv', 'flv', 'wmv', 'm4v', '3gp', 'ogv', 'mts', 'm2ts'];
      const mediaFiles: File[] = [];
      
      for (const entry of entries) {
        if (entry.name === undefined) {
          continue;
        }
        
        const extension = entry.name.split('.').pop()?.toLowerCase();
        if (extension && supportedExtensions.includes(extension)) {
          try {
            const fullPath = await join(folderPath, entry.name);
            if (await exists(fullPath)) {
              const file = await fileFromPath(fullPath);
              mediaFiles.push(file);
              setFilePath(file, fullPath);
            }
          } catch (error) {
            console.warn(`Failed to process file ${entry.name}:`, error);
          }
        }
      }
      
      return mediaFiles;
    } catch (error) {
      console.error("Failed to scan folder:", error);
      throw new Error("Failed to scan folder. Please check permissions.");
    }
  }, [setFilePath]);

  // Handle folder selection
  const handleFolderSelected = useCallback(async (folderPath: string) => {
    const folderId = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create initial folder info
    const initialFolderInfo: FolderInfo = {
      id: folderId,
      folderPath,
      files: [],
      imageCount: 0,
      videoCount: 0,
      thumbnailProgress: 0,
      isGeneratingThumbnails: true,
      thumbnailsReady: false,
      batchProcessingState: 'scanning',
      assignedTemplateId: templateSettings.activeTemplateId,
    };

    // Add to folders list
    addBatchFolder(initialFolderInfo);

    try {
      // Scan folder for files
      const files = await scanFolder(folderPath);
      const imageCount = files.filter(f => f.type.startsWith("image/")).length;
      const videoCount = files.filter(f => f.type.startsWith("video/")).length;

      if (files.length === 0) {
        throw new Error("No supported media files found in this folder.");
      }

      // Update folder info with counts
      updateBatchFolder(folderId, { files, imageCount, videoCount });

      // Generate thumbnails
      const cached = await thumbnailCache.generateThumbnails(
        folderPath,
        files,
        (progress) => {
          updateBatchFolder(folderId, { thumbnailProgress: progress });
        },
        () => {
          // Individual thumbnail ready - no specific action needed
        }
      );

      // Add to cached folders
      setCachedFolders(prev => new Map(prev).set(folderPath, cached));

      // Mark as ready (thumbnails done, batch processing pending)
      updateBatchFolder(folderId, {
        isGeneratingThumbnails: false,
        thumbnailsReady: true,
        thumbnailProgress: 100,
        batchProcessingState: 'ready',
      });

    } catch (error) {
      console.error("Error processing folder:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      updateBatchFolder(folderId, {
        isGeneratingThumbnails: false,
        thumbnailsReady: false,
        error: errorMessage,
      });
    }
  }, [scanFolder, addBatchFolder, updateBatchFolder, templateSettings.activeTemplateId]);

  // Load thumbnails to main section
  const handleLoadThumbnails = useCallback((folderInfo: FolderInfo) => {
    const cached = cachedFolders.get(folderInfo.folderPath);
    if (!cached) return;

    try {
      setFiles(cached.files);
      
      cached.files.forEach(file => {
        const thumbnailUrl = cached.thumbnails.get(file);
        if (thumbnailUrl) {
          thumbnails.upsert({ file, thumbnailUrl });
        }
      });
      
      if (cached.files.length > 0) {
        setSelectedFile(cached.files[0]);
      }
      
      generated.clear();
      setHasAttemptedGeneration(false);
      
    } catch (error) {
      console.error("Error loading thumbnails to main section:", error);
    }
  }, [cachedFolders, setFiles, thumbnails, generated, setSelectedFile, setHasAttemptedGeneration]);

  // Remove folder
  const handleRemoveFolder = useCallback((folderId: string, folderPath: string) => {
    removeBatchFolder(folderId);
    thumbnailCache.clearFolder(folderPath);
    
    // Also remove from cached folders
    setCachedFolders(prev => {
      const newMap = new Map(prev);
      newMap.delete(folderPath);
      return newMap;
    });
  }, [removeBatchFolder]);

  // Retry folder processing
  const handleRetryFolder = useCallback((folderInfo: FolderInfo) => {
    handleFolderSelected(folderInfo.folderPath);
    handleRemoveFolder(folderInfo.id, folderInfo.folderPath);
  }, [handleFolderSelected, handleRemoveFolder]);

  // Handle template change for a folder
  const handleTemplateChange = useCallback((folderId: string, templateId: string | null) => {
    updateBatchFolder(folderId, { assignedTemplateId: templateId });
  }, [updateBatchFolder]);

  // Handle start batch processing
  const handleStartBatchProcessing = useCallback(async () => {
    // Check if API is configured
    if (!api.selectedProvider || !api.selectedModel) {
      toast.error('Please configure AI provider and model in settings');
      settingsDialog.setIsOpen(true);
      return;
    }

    // Check if API key is set
    const apiKey = api.apiKeys[api.selectedProvider];
    if (!apiKey) {
      toast.error(`Please set your ${api.selectedProvider} API key in settings`);
      settingsDialog.setIsOpen(true);
      settingsDialog.setDefaultTab('api-keys');
      return;
    }

    // Check if export path is configured
    const savedExportPath = localStorage.getItem('exportPath');
    if (!savedExportPath) {
      toast.error('Please set an export path in settings before batch processing');
      settingsDialog.setIsOpen(true);
      settingsDialog.setDefaultTab('metadata');
      return;
    }

    // Get ready folders
    const readyFolders = batchFolders.filter(f => f.batchProcessingState === 'ready');
    if (readyFolders.length === 0) {
      toast.error('No folders ready for processing. Please wait for thumbnails to finish generating.');
      return;
    }

    // Build file path map from all folders
    const filePathMap = new Map<File, string>();
    readyFolders.forEach(folder => {
      folder.files.forEach(file => {
        const path = getFilePath(file);
        if (path) {
          filePathMap.set(file, path);
        }
      });
    });

    // Determine export platform (use Adobe Stock as default)
    const exportPlatform: 'adobeStock' | 'shutterStock' = 'adobeStock';

    // Start batch processing
    await startBatchProcessing(
      readyFolders,
      {
        provider: api.selectedProvider,
        model: api.selectedModel,
        apiKey,
        limits: metadataLimits,
        includePlaceName: metadataOptions.includePlaceName,
        avoidWords: {
          titleAvoidWords: metadataOptions.titleAvoidWords,
          keywordsAvoidWords: metadataOptions.keywordsAvoidWords,
          descriptionAvoidWords: metadataOptions.descriptionAvoidWords,
        },
        requestDelay: api.requestDelay,
        embedEnabled: embedSettings.enabled,
        embedFields: embedSettings.fields,
        processingMode: api.processingMode,
        parallelWorkers: api.parallelWorkers,
      },
      filePathMap,
      categories,
      exportPlatform,
      savedExportPath
    );
  }, [api, batchFolders, categories, embedSettings, getFilePath, metadataLimits, metadataOptions, settingsDialog]);

  // Count ready folders
  const readyFolderCount = batchFolders.filter(f => f.batchProcessingState === 'ready').length;

  // Show drop zone if no folders are added
  if (batchFolders.length === 0) {
    return (
      <div className="h-full p-4">
        <FolderDropZone onFolderSelected={handleFolderSelected} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 @container">
      {/* Batch Processing Controls */}
      <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center">
          {/* <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Folder className="w-4 h-4" />
            <span>{readyFolderCount} ready</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Image className="w-4 h-4" />
            <span>{totalImageCount} images</span>
          </div> */}
          {api.processingMode === 'parallel' && (
            <Badge variant="outline" className="text-xs">
              {api.parallelWorkers} workers
            </Badge>
          )}
        </div>
        
        <div className="flex items-center">

          
          <Button
            size="sm"
            onClick={handleStartBatchProcessing}
            disabled={isProcessing || readyFolderCount === 0}
            className={readyFolderCount > 0 && !isProcessing ? 'bg-accent-foreground hover:bg-accent-foreground/20' : ''}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1.5" />
                ({readyFolderCount})
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Folders List - Vertical Layout */}
      <div className="flex flex-col gap-2 overflow-y-auto">
        {batchFolders.map(folderInfo => {
          // Find the corresponding folder process state
          const folderProcessState = batchProcess.folders.find(
            f => f.folderId === folderInfo.id
          );
          
          return (
            <div className="w-full bg-transparent">
            <FolderInfoCard
              key={folderInfo.id}
              folderInfo={folderInfo}
              userTemplates={templateSettings.userTemplates}
              onLoadThumbnails={() => handleLoadThumbnails(folderInfo)}
              onRemove={() => handleRemoveFolder(folderInfo.id, folderInfo.folderPath)}
              onRegenerate={() => handleRetryFolder(folderInfo)}
              onTemplateChange={(templateId) => handleTemplateChange(folderInfo.id, templateId)}
              isProcessing={isProcessing}
              folderProcessState={folderProcessState}
              currentStage={batchProcess.currentStage}
            /></div>
          );
        })}
        
        {/* Add Another Folder Button */}
        <FolderDropZone 
          onFolderSelected={handleFolderSelected} 
          compact={true}
        />
      </div>
    </div>
  );
};
