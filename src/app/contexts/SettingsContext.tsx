import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { EmbeddedMetadata, MetadataSyncStatus } from '@/app/lib/metadata/types';

type Provider = 'openai' | 'gemini' | 'mistral' | 'groq' | 'openrouter';

// Embedded metadata tracking for a file
type FileEmbeddedState = {
  file: File;
  filePath?: string;
  embeddedMetadata?: EmbeddedMetadata;
  syncStatus: MetadataSyncStatus;
  lastSyncError?: string;
  lastSyncTime?: Date;
};

type ThumbnailData = {
  file: File;
  thumbnailUrl: string;
};

type GeneratedMetadata = {
  title: string;
  description: string;
  keywords: string; // comma separated
};

type FileMetadata = {
  file: File;
  metadata: GeneratedMetadata;
  categories?: CategorySelection;
};

type MetadataLimits = {
  titleLimit: number;
  descriptionLimit: number;
  keywordLimit: number;
};

type MetadataOptions = {
  includePlaceName: boolean;
};

type ApiSettingsState = {
  selectedProvider: Provider | '';
  setSelectedProvider: (p: Provider | '') => void;
  selectedModel: string;
  setSelectedModel: (m: string) => void;
  apiKeys: Record<Provider, string>;
  setApiKey: (provider: Provider, key: string) => void;
  requestDelay: number;
  setRequestDelay: (delay: number) => void;
};

type CategorySelection = {
  adobeStock: string;
  shutterStock1: string;
  shutterStock2: string;
};

type GenerationProgress = {
  isGenerating: boolean;
  currentIndex: number;
  currentFileName: string;
  totalFiles: number;
};

type SettingsDialogState = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  defaultTab: string;
  setDefaultTab: (tab: string) => void;
};

type SettingsContextType = {
  api: ApiSettingsState;
  metadataLimits: MetadataLimits & { setLimits: (l: Partial<MetadataLimits>) => void };
  metadataOptions: MetadataOptions & { setOptions: (o: Partial<MetadataOptions>) => void };
  files: File[];
  setFiles: (files: File[]) => void;
  thumbnails: {
    items: ThumbnailData[];
    setItems: (items: ThumbnailData[]) => void;
    upsert: (t: ThumbnailData) => void;
    clear: () => void;
    isGenerating: boolean;
    setIsGenerating: (generating: boolean) => void;
    pendingCount: number;
  };
  generated: {
    items: FileMetadata[];
    getMetadata: (file: File) => GeneratedMetadata | undefined;
    setMetadata: (file: File, metadata: Partial<GeneratedMetadata>) => void;
    getCategories: (file: File) => CategorySelection | undefined;
    setFileCategories: (file: File, categories: Partial<CategorySelection>) => void;
    clear: () => void;
  };
  // Embedded metadata state (for reading/writing to files)
  embedded: {
    items: FileEmbeddedState[];
    getEmbedded: (file: File) => FileEmbeddedState | undefined;
    setFilePath: (file: File, filePath: string) => void;
    setEmbeddedMetadata: (file: File, metadata: EmbeddedMetadata) => void;
    setSyncStatus: (file: File, status: MetadataSyncStatus, error?: string) => void;
    clear: () => void;
    // Auto-sync settings
    autoSyncEnabled: boolean;
    setAutoSyncEnabled: (enabled: boolean) => void;
  };
  generationProgress: GenerationProgress;
  setGenerationProgress: (progress: Partial<GenerationProgress>) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  hasAttemptedGeneration: boolean;
  setHasAttemptedGeneration: (attempted: boolean) => void;
  categories: CategorySelection;
  setCategories: (categories: Partial<CategorySelection>) => void;
  settingsDialog: SettingsDialogState;
  hasApiKey: () => boolean;
};

const defaultApiKeys: Record<Provider, string> = {
  openai: '',
  gemini: '',
  mistral: '',
  groq: '',
  openrouter: '',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Helper functions for localStorage
const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    toast.error("Error loading from localStorage.");
    return defaultValue;
  }
};

const saveToLocalStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    console.log(`✓ Saved ${key} to localStorage:`, value);
    toast.success("Settings saved!");
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
    toast.error("Error saving to localStorage.");
  }
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  // Load initial values from localStorage
  const [selectedProvider, setSelectedProviderState] = useState<Provider | ''>(() =>
    loadFromLocalStorage('selectedProvider', '')
  );
  const [selectedModel, setSelectedModelState] = useState(() =>
    loadFromLocalStorage('selectedModel', '')
  );
  const [apiKeys, setApiKeysState] = useState<Record<Provider, string>>(() =>
    loadFromLocalStorage('apiKeys', defaultApiKeys)
  );
  const [requestDelay, setRequestDelayState] = useState<number>(() =>
    loadFromLocalStorage('requestDelay', 1000)
  );

  // Wrapper functions that also save to localStorage
  const setSelectedProvider = (provider: Provider | '') => {
    setSelectedProviderState(provider);
    saveToLocalStorage('selectedProvider', provider);
  };

  const setSelectedModel = (model: string) => {
    setSelectedModelState(model);
    saveToLocalStorage('selectedModel', model);
  };

  const setApiKeys = (keys: Record<Provider, string>) => {
    setApiKeysState(keys);
    saveToLocalStorage('apiKeys', keys);
  };

  const setApiKey = (provider: Provider, key: string) => {
    const newKeys = { ...apiKeys, [provider]: key };
    setApiKeys(newKeys);
  };

  const setRequestDelay = (delay: number) => {
    setRequestDelayState(delay);
    saveToLocalStorage('requestDelay', delay);
  };

  // Settings dialog state
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsDialogDefaultTab, setSettingsDialogDefaultTab] = useState('models');

  // Function to check if any API key is configured
  const hasApiKey = useCallback(() => {
    return Object.values(apiKeys).some(key => key && key.trim() !== '');
  }, [apiKeys]);

  const [files, setFiles] = useState<File[]>([]);
  const [thumbnails, setThumbnails] = useState<ThumbnailData[]>([]);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  const [pendingThumbnailCount, setPendingThumbnailCount] = useState(0);

  // Memoize upsert to prevent unnecessary re-renders
  const upsert = useCallback((t: ThumbnailData) => {
    console.log('🔧 UPSERT called with file:', t.file.name, 'URL:', t.thumbnailUrl.substring(0, 50) + '...');
    setThumbnails((prev) => {
      // Check if already exists to avoid unnecessary updates
      const existingIndex = prev.findIndex((p) => p.file === t.file);
      if (existingIndex !== -1) {
        // Update existing
        const newArray = [...prev];
        newArray[existingIndex] = t;
        return newArray;
      } else {
        // Add new
        return [...prev, t];
      }
    });
    // Decrement pending count
    setPendingThumbnailCount(prev => Math.max(0, prev - 1));
  }, []);

  const clearThumbs = useCallback(() => {
    console.log('🗑️  Clearing all thumbnails');
    setThumbnails([]);
    setPendingThumbnailCount(0);
    setIsGeneratingThumbnails(false);
  }, []);

  // Track thumbnail state changes (throttled logging)
  useEffect(() => {
    console.log('📊 Thumbnails state updated! Count:', thumbnails.length);
    // Only log first 3 to reduce console spam
    thumbnails.slice(0, 3).forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.file.name} -> ${t.thumbnailUrl.substring(0, 50)}...`);
    });
    if (thumbnails.length > 3) {
      console.log(`  ... and ${thumbnails.length - 3} more`);
    }
  }, [thumbnails]);

  // Generate thumbnails when files change
  useEffect(() => {
    console.log("📁 Files changed:", files?.length, "files");
    console.log("🖼️  Current thumbnails in context:", thumbnails.length);

    if (!files || files.length === 0) {
      setIsGeneratingThumbnails(false);
      return;
    }

    // Count how many thumbnails need to be generated
    const filesToGenerate = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const alreadyHasThumbnail = thumbnails.find((t) => t.file === file);
      return (isImage || isVideo) && !alreadyHasThumbnail;
    });

    if (filesToGenerate.length === 0) {
      setIsGeneratingThumbnails(false);
      return;
    }

    // Set generating state
    setIsGeneratingThumbnails(true);
    console.log(
      `🚀 Starting generation of ${filesToGenerate.length} thumbnails...`
    );

    // Generate thumbnails in parallel using batch processing
    // This runs asynchronously and doesn't block the UI
    (async () => {
      try {
        const { generateThumbnailsBatch } = await import("@/app/lib/thumbnailGenerator");

        const results = await generateThumbnailsBatch(
          filesToGenerate,
          (completed, total, fileName) => {
            console.log(`⚡ Progress: ${completed}/${total} - ${fileName}`);
          },
          (file, thumbnailUrl) => {
            // Update UI as each thumbnail is ready (batched in generator)
            upsert({ file, thumbnailUrl });
            console.log(`✨ Thumbnail ready: ${file.name}`);
          },
          2 // Process 2 thumbnails concurrently to avoid freezing (reduced from 4)
        );

        setIsGeneratingThumbnails(false);
        console.log(`✅ Completed ${results.size} thumbnails`);
      } catch (error) {
        console.error("❌ Batch thumbnail generation failed:", error);
        setIsGeneratingThumbnails(false);
      }
    })();
  }, [files]); // Only depend on files, not thumbnails to avoid infinite loop

  // Check if all thumbnails are done
  useEffect(() => {
    if (isGeneratingThumbnails && files && files.length > 0) {
      const allDone = files.every((file) => {
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");
        if (!isImage && !isVideo) return true; // Skip non-media files
        return thumbnails.find((t) => t.file === file) !== undefined;
      });

      if (allDone) {
        console.log("✅ All thumbnails generated!");
        setIsGeneratingThumbnails(false);
      }
    }
  }, [thumbnails, files, isGeneratingThumbnails]);

  const [generatedMetadata, setGeneratedMetadata] = useState<FileMetadata[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false);

  // Generation progress state
  const [generationProgress, setGenerationProgressState] = useState<GenerationProgress>({
    isGenerating: false,
    currentIndex: 0,
    currentFileName: '',
    totalFiles: 0,
  });

  const setGenerationProgress = (progress: Partial<GenerationProgress>) => {
    setGenerationProgressState((prev) => ({ ...prev, ...progress }));
  };

  // Category selection state
  const [categories, setCategoriesState] = useState<CategorySelection>({
    adobeStock: '',
    shutterStock1: '',
    shutterStock2: '',
  });

  const setCategories = (newCategories: Partial<CategorySelection>) => {
    setCategoriesState((prev) => ({ ...prev, ...newCategories }));
  };

  const getMetadata = useCallback((file: File): GeneratedMetadata | undefined => {
    const found = generatedMetadata.find((fm) => fm.file === file);
    return found?.metadata;
  }, [generatedMetadata]);

  const setMetadata = useCallback((file: File, metadata: Partial<GeneratedMetadata>) => {
    setGeneratedMetadata((prev) => {
      const existingIndex = prev.findIndex((fm) => fm.file === file);
      if (existingIndex !== -1) {
        // Update existing - use index for better performance
        const newArray = [...prev];
        newArray[existingIndex] = {
          ...newArray[existingIndex],
          metadata: { ...newArray[existingIndex].metadata, ...metadata }
        };
        return newArray;
      } else {
        // Add new
        return [
          ...prev,
          {
            file,
            metadata: {
              title: metadata.title || '',
              description: metadata.description || '',
              keywords: metadata.keywords || '',
            },
          },
        ];
      }
    });
  }, []);

  const getCategories = useCallback((file: File): CategorySelection | undefined => {
    const found = generatedMetadata.find((fm) => fm.file === file);
    return found?.categories;
  }, [generatedMetadata]);

  const setFileCategories = useCallback((file: File, newCategories: Partial<CategorySelection>) => {
    setGeneratedMetadata((prev) => {
      const existingIndex = prev.findIndex((fm) => fm.file === file);
      if (existingIndex !== -1) {
        // Update existing - use index for better performance
        const newArray = [...prev];
        newArray[existingIndex] = {
          ...newArray[existingIndex],
          categories: {
            ...(newArray[existingIndex].categories || { adobeStock: '', shutterStock1: '', shutterStock2: '' }),
            ...newCategories
          }
        };
        return newArray;
      } else {
        // If file doesn't exist in metadata yet, create it with empty metadata
        return [
          ...prev,
          {
            file,
            metadata: {
              title: '',
              description: '',
              keywords: '',
            },
            categories: {
              adobeStock: newCategories.adobeStock || '',
              shutterStock1: newCategories.shutterStock1 || '',
              shutterStock2: newCategories.shutterStock2 || '',
            },
          },
        ];
      }
    });
  }, []);

  const clearGenerated = useCallback(() => setGeneratedMetadata([]), []);

  // Embedded metadata state
  const [embeddedMetadataState, setEmbeddedMetadataState] = useState<FileEmbeddedState[]>([]);
  const [autoSyncEnabled, setAutoSyncEnabledState] = useState<boolean>(() =>
    loadFromLocalStorage('autoSyncEnabled', false)
  );

  const setAutoSyncEnabled = useCallback((enabled: boolean) => {
    setAutoSyncEnabledState(enabled);
    saveToLocalStorage('autoSyncEnabled', enabled);
  }, []);

  const getEmbedded = useCallback((file: File): FileEmbeddedState | undefined => {
    return embeddedMetadataState.find((item) => item.file === file);
  }, [embeddedMetadataState]);

  const setFilePath = useCallback((file: File, filePath: string) => {
    setEmbeddedMetadataState((prev) => {
      const existingIndex = prev.findIndex((item) => item.file === file);
      if (existingIndex !== -1) {
        const newArray = [...prev];
        newArray[existingIndex] = { ...newArray[existingIndex], filePath };
        return newArray;
      }
      return [...prev, { file, filePath, syncStatus: 'unsynced' as MetadataSyncStatus }];
    });
  }, []);

  const setEmbeddedMetadata = useCallback((file: File, metadata: EmbeddedMetadata) => {
    setEmbeddedMetadataState((prev) => {
      const existingIndex = prev.findIndex((item) => item.file === file);
      if (existingIndex !== -1) {
        const newArray = [...prev];
        newArray[existingIndex] = {
          ...newArray[existingIndex],
          embeddedMetadata: metadata,
          syncStatus: 'synced' as MetadataSyncStatus,
          lastSyncTime: new Date(),
        };
        return newArray;
      }
      return [...prev, {
        file,
        embeddedMetadata: metadata,
        syncStatus: 'synced' as MetadataSyncStatus,
        lastSyncTime: new Date(),
      }];
    });
  }, []);

  const setSyncStatus = useCallback((file: File, status: MetadataSyncStatus, error?: string) => {
    setEmbeddedMetadataState((prev) => {
      const existingIndex = prev.findIndex((item) => item.file === file);
      if (existingIndex !== -1) {
        const newArray = [...prev];
        newArray[existingIndex] = {
          ...newArray[existingIndex],
          syncStatus: status,
          lastSyncError: error,
          lastSyncTime: new Date(),
        };
        return newArray;
      }
      return [...prev, {
        file,
        syncStatus: status,
        lastSyncError: error,
        lastSyncTime: new Date(),
      }];
    });
  }, []);

  const clearEmbedded = useCallback(() => setEmbeddedMetadataState([]), []);

  // Load limits from localStorage with defaults
  const [limits, setLimitsState] = useState<MetadataLimits>(() => {
    const saved = loadFromLocalStorage('metadataLimits', null) as MetadataLimits | null;
    if (saved) {
      return {
        titleLimit: saved.titleLimit ?? 200,
        descriptionLimit: saved.descriptionLimit ?? 200,
        keywordLimit: saved.keywordLimit ?? 80,
      };
    }
    return { titleLimit: 200, descriptionLimit: 200, keywordLimit: 80 };
  });

  const setLimits = (l: Partial<MetadataLimits>) => {
    setLimitsState((prev) => {
      const newLimits = { ...prev, ...l };
      saveToLocalStorage('metadataLimits', newLimits);
      return newLimits;
    });
  };

  // Load metadata options from localStorage with defaults
  const [options, setOptionsState] = useState<MetadataOptions>(() => {
    const saved = loadFromLocalStorage('metadataOptions', null) as MetadataOptions | null;
    if (saved) {
      return {
        includePlaceName: saved.includePlaceName ?? false,
      };
    }
    return { includePlaceName: false };
  });

  const setOptions = (o: Partial<MetadataOptions>) => {
    setOptionsState((prev) => {
      const newOptions = { ...prev, ...o };
      saveToLocalStorage('metadataOptions', newOptions);
      return newOptions;
    });
  };

  // Memoize API object to prevent unnecessary re-renders
  const apiValue = useMemo(() => ({
    selectedProvider,
    setSelectedProvider,
    selectedModel,
    setSelectedModel,
    apiKeys,
    setApiKey,
    requestDelay,
    setRequestDelay,
  }), [selectedProvider, selectedModel, apiKeys, requestDelay, setSelectedProvider, setSelectedModel, setApiKey, setRequestDelay]);

  // Memoize thumbnails object
  const thumbnailsValue = useMemo(() => ({
    items: thumbnails,
    setItems: setThumbnails,
    upsert,
    clear: clearThumbs,
    isGenerating: isGeneratingThumbnails,
    setIsGenerating: setIsGeneratingThumbnails,
    pendingCount: pendingThumbnailCount,
  }), [thumbnails, upsert, clearThumbs, isGeneratingThumbnails, pendingThumbnailCount]);

  // Memoize generated object
  const generatedValue = useMemo(() => ({
    items: generatedMetadata,
    getMetadata,
    setMetadata,
    getCategories,
    setFileCategories,
    clear: clearGenerated,
  }), [generatedMetadata, getMetadata, setMetadata, getCategories, setFileCategories, clearGenerated]);

  // Memoize embedded metadata object
  const embeddedValue = useMemo(() => ({
    items: embeddedMetadataState,
    getEmbedded,
    setFilePath,
    setEmbeddedMetadata,
    setSyncStatus,
    clear: clearEmbedded,
    autoSyncEnabled,
    setAutoSyncEnabled,
  }), [embeddedMetadataState, getEmbedded, setFilePath, setEmbeddedMetadata, setSyncStatus, clearEmbedded, autoSyncEnabled, setAutoSyncEnabled]);

  // Memoize metadata limits
  const metadataLimitsValue = useMemo(() => ({
    ...limits,
    setLimits,
  }), [limits, setLimits]);

  // Memoize metadata options
  const metadataOptionsValue = useMemo(() => ({
    ...options,
    setOptions,
  }), [options, setOptions]);

  // Memoize settings dialog state
  const settingsDialogValue = useMemo(() => ({
    isOpen: settingsDialogOpen,
    setIsOpen: setSettingsDialogOpen,
    defaultTab: settingsDialogDefaultTab,
    setDefaultTab: setSettingsDialogDefaultTab,
  }), [settingsDialogOpen, settingsDialogDefaultTab]);

  const value: SettingsContextType = useMemo(() => ({
    api: apiValue,
    metadataLimits: metadataLimitsValue,
    metadataOptions: metadataOptionsValue,
    files,
    setFiles,
    thumbnails: thumbnailsValue,
    generated: generatedValue,
    embedded: embeddedValue,
    generationProgress,
    setGenerationProgress,
    selectedFile,
    setSelectedFile,
    hasAttemptedGeneration,
    setHasAttemptedGeneration,
    categories,
    setCategories,
    settingsDialog: settingsDialogValue,
    hasApiKey,
  }), [
    apiValue,
    metadataLimitsValue,
    metadataOptionsValue,
    files,
    thumbnailsValue,
    generatedValue,
    embeddedValue,
    generationProgress,
    selectedFile,
    hasAttemptedGeneration,
    categories,
    settingsDialogValue,
    hasApiKey,
  ]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
