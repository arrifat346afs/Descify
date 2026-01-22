import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';

type Provider = 'openai' | 'gemini' | 'mistral' | 'groq' | 'openrouter';

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
  customInstruction?: string;
};

type MetadataLimits = {
  titleLimit: number;
  descriptionLimit: number;
  keywordLimit: number;
};

type MetadataOptions = {
  includePlaceName: boolean;
};

type EmbedSettings = {
  enabled: boolean;
  fields: {
    title: boolean;
    description: boolean;
    keywords: boolean;
  };
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
  cancelRequested: boolean;
};

type UserTemplate = {
  id: string;
  name: string;
  template: string;
  createdAt: Date;
};

type TemplateSettings = {
  activeTemplateId: string | null;
  userTemplates: UserTemplate[];
  setActiveTemplate: (id: string | null) => void;
  addUserTemplate: (template: Omit<UserTemplate, 'id' | 'createdAt'>) => void;
  updateUserTemplate: (id: string, template: Partial<UserTemplate>) => void;
  deleteUserTemplate: (id: string) => void;
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
  embedSettings: EmbedSettings & { setEmbedSettings: (s: Partial<EmbedSettings>) => void };
  templateSettings: TemplateSettings;
  files: File[];
  setFiles: (files: File[]) => void;
  removeFile: (file: File) => void;
  filePaths: Map<File, string>;
  setFilePath: (file: File, path: string) => void;
  getFilePath: (file: File) => string | undefined;
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
    getCustomInstruction: (file: File) => string | undefined;
    setCustomInstruction: (file: File, instruction: string) => void;
    clear: () => void;
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
  const [filePaths, setFilePaths] = useState<Map<File, string>>(new Map());
  const [thumbnails, setThumbnails] = useState<ThumbnailData[]>([]);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  const [pendingThumbnailCount, setPendingThumbnailCount] = useState(0);

  // Load embed settings from localStorage with defaults
  const [embedSettings, setEmbedSettingsState] = useState<EmbedSettings>(() => {
    const saved = loadFromLocalStorage('embedSettings', null) as EmbedSettings | null;
    if (saved) {
      return {
        enabled: saved.enabled ?? true,
        fields: {
          title: saved.fields?.title ?? true,
          description: saved.fields?.description ?? true,
          keywords: saved.fields?.keywords ?? true,
        },
      };
    }
    return {
      enabled: true,
      fields: {
        title: true,
        description: true,
        keywords: true,
      },
    };
  });

  const setEmbedSettings = (s: Partial<EmbedSettings>) => {
    setEmbedSettingsState((prev) => {
      const newSettings = {
        enabled: s.enabled ?? prev.enabled,
        fields: {
          title: s.fields?.title ?? prev.fields.title,
          description: s.fields?.description ?? prev.fields.description,
          keywords: s.fields?.keywords ?? prev.fields.keywords,
        },
      };
      saveToLocalStorage('embedSettings', newSettings);
      return newSettings;
    });
  };

  // File management functions
  const removeFile = useCallback((fileToRemove: File) => {
    console.log('🗑️ Removing file:', fileToRemove.name);

    // Remove from files array
    setFiles((prev) => prev.filter(f => f !== fileToRemove));

    // Remove from file paths
    setFilePaths((prev) => {
      const newMap = new Map(prev);
      newMap.delete(fileToRemove);
      return newMap;
    });

    // Remove from thumbnails
    setThumbnails((prev) => prev.filter(t => t.file !== fileToRemove));

    // Remove from generated metadata
    setGeneratedMetadata((prev) => prev.filter(fm => fm.file !== fileToRemove));

    // Clear selected file if it was the removed file
    setSelectedFile((prev) => prev === fileToRemove ? null : prev);

    console.log('✅ File removed successfully');
  }, []);

  // File path management functions
  const setFilePath = useCallback((file: File, path: string) => {
    setFilePaths((prev) => new Map(prev.set(file, path)));
  }, []);

  const getFilePath = useCallback((file: File): string | undefined => {
    return filePaths.get(file);
  }, [filePaths]);

  // Batched thumbnail updates to reduce React re-renders
  const pendingThumbnailUpdates = useRef<ThumbnailData[]>([]);
  const batchUpdateScheduled = useRef<number | null>(null);
  const BATCH_UPDATE_DELAY = 50; // ms - batch updates together (faster for responsiveness)

  const flushThumbnailUpdates = useCallback(() => {
    if (pendingThumbnailUpdates.current.length === 0) return;

    const updates = [...pendingThumbnailUpdates.current];
    pendingThumbnailUpdates.current = [];
    batchUpdateScheduled.current = null;

    setThumbnails((prev) => {
      // Use a Map for O(1) lookup
      const existingMap = new Map<File, number>();
      prev.forEach((p, i) => existingMap.set(p.file, i));

      const newArray = [...prev];
      let addedCount = 0;

      for (const t of updates) {
        const existingIndex = existingMap.get(t.file);
        if (existingIndex !== undefined) {
          // Update existing
          newArray[existingIndex] = t;
        } else {
          // Add new
          newArray.push(t);
          existingMap.set(t.file, newArray.length - 1);
          addedCount++;
        }
      }

      console.log(`📦 Batched ${updates.length} thumbnail updates (${addedCount} new)`);
      return newArray;
    });

    setPendingThumbnailCount(prev => Math.max(0, prev - updates.length));
  }, []);

  // Memoize upsert to batch updates and prevent excessive re-renders
  const upsert = useCallback((t: ThumbnailData) => {
    pendingThumbnailUpdates.current.push(t);

    // Schedule batch update if not already scheduled
    if (batchUpdateScheduled.current === null) {
      batchUpdateScheduled.current = window.setTimeout(() => {
        flushThumbnailUpdates();
      }, BATCH_UPDATE_DELAY);
    }
  }, [flushThumbnailUpdates]);

  const clearThumbs = useCallback(() => {
    console.log('🗑️  Clearing all thumbnails');
    // Clear any pending updates
    pendingThumbnailUpdates.current = [];
    if (batchUpdateScheduled.current !== null) {
      clearTimeout(batchUpdateScheduled.current);
      batchUpdateScheduled.current = null;
    }
    setThumbnails([]);
    setPendingThumbnailCount(0);
    setIsGeneratingThumbnails(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchUpdateScheduled.current !== null) {
        clearTimeout(batchUpdateScheduled.current);
      }
    };
  }, []);

  // Track thumbnail state changes (throttled logging for large batches)
  const lastLoggedCount = useRef(0);
  useEffect(() => {
    // Only log when count changes significantly or completes
    const count = thumbnails.length;
    if (count === 0 || count === lastLoggedCount.current) return;

    // Log every 50 thumbnails or on completion
    if (count % 50 === 0 || !isGeneratingThumbnails) {
      console.log(`📊 Thumbnails: ${count} (generating: ${isGeneratingThumbnails})`);
      lastLoggedCount.current = count;
    }
  }, [thumbnails.length, isGeneratingThumbnails]);

  // Generate thumbnails when files change
  // Use a ref to track the current generation to avoid stale closures
  const generationIdRef = useRef(0);

  useEffect(() => {
    if (!files || files.length === 0) {
      setIsGeneratingThumbnails(false);
      return;
    }

    // Use Set for O(1) lookup instead of find() which is O(n)
    const existingThumbnailFiles = new Set(thumbnails.map(t => t.file));

    // Filter files that need thumbnail generation
    const filesToGenerate = files.filter((file) => {
      const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");
      return isMedia && !existingThumbnailFiles.has(file);
    });

    if (filesToGenerate.length === 0) {
      setIsGeneratingThumbnails(false);
      return;
    }

    // Increment generation ID to track this specific generation
    const currentGenerationId = ++generationIdRef.current;

    // Set generating state
    setIsGeneratingThumbnails(true);
    console.log(`🚀 Starting generation of ${filesToGenerate.length} thumbnails (batch #${currentGenerationId})...`);

    // Generate thumbnails in parallel using optimized batch processing
    (async () => {
      try {
        const { generateThumbnailsBatch } = await import("@/app/lib/thumbnailGenerator");

        // Throttle progress logging for large batches
        let lastProgressLog = 0;
        const PROGRESS_LOG_INTERVAL = 25;

        await generateThumbnailsBatch(
          filesToGenerate,
          (completed, total, fileName) => {
            // Only log every N files to reduce console spam
            if (completed - lastProgressLog >= PROGRESS_LOG_INTERVAL || completed === total) {
              console.log(`⚡ Progress: ${completed}/${total} - ${fileName}`);
              lastProgressLog = completed;
            }
          },
          (file, thumbnailUrl) => {
            // Check if this generation is still current
            if (generationIdRef.current !== currentGenerationId) return;
            upsert({ file, thumbnailUrl });
          }
        );

        // Only update state if this generation is still current
        if (generationIdRef.current === currentGenerationId) {
          // Flush any remaining batched updates
          flushThumbnailUpdates();
          setIsGeneratingThumbnails(false);
          console.log(`✅ Completed batch #${currentGenerationId}`);
        }
      } catch (error) {
        console.error("❌ Batch thumbnail generation failed:", error);
        if (generationIdRef.current === currentGenerationId) {
          setIsGeneratingThumbnails(false);
        }
      }
    })();
  }, [files, upsert, flushThumbnailUpdates]); // Only depend on files

  // Check if all thumbnails are done - use Set for O(1) lookup
  useEffect(() => {
    if (isGeneratingThumbnails && files && files.length > 0) {
      // Use Set for O(1) lookup instead of find()
      const thumbnailFileSet = new Set(thumbnails.map(t => t.file));

      const allDone = files.every((file) => {
        const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");
        if (!isMedia) return true; // Skip non-media files
        return thumbnailFileSet.has(file);
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
    cancelRequested: false,
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

  const getCustomInstruction = useCallback((file: File): string | undefined => {
    const found = generatedMetadata.find((fm) => fm.file === file);
    return found?.customInstruction;
  }, [generatedMetadata]);

  const setCustomInstruction = useCallback((file: File, instruction: string) => {
    setGeneratedMetadata((prev) => {
      const existingIndex = prev.findIndex((fm) => fm.file === file);
      if (existingIndex !== -1) {
        // Update existing - use index for better performance
        const newArray = [...prev];
        newArray[existingIndex] = {
          ...newArray[existingIndex],
          customInstruction: instruction
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
            customInstruction: instruction,
          },
        ];
      }
    });
  }, []);

  const clearGenerated = useCallback(() => setGeneratedMetadata([]), []);

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

  // Load template settings from localStorage with defaults
  const [activeTemplateId, setActiveTemplateIdState] = useState<string | null>(() =>
    loadFromLocalStorage('activeTemplateId', null)
  );
  const [userTemplates, setUserTemplatesState] = useState<UserTemplate[]>(() =>
    loadFromLocalStorage('userTemplates', [])
  );

  const setActiveTemplate = (id: string | null) => {
    setActiveTemplateIdState(id);
    saveToLocalStorage('activeTemplateId', id);
  };

  const addUserTemplate = (template: Omit<UserTemplate, 'id' | 'createdAt'>) => {
    const newTemplate: UserTemplate = {
      ...template,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setUserTemplatesState((prev) => {
      const updated = [...prev, newTemplate];
      saveToLocalStorage('userTemplates', updated);
      return updated;
    });
  };

  const updateUserTemplate = (id: string, template: Partial<UserTemplate>) => {
    setUserTemplatesState((prev) => {
      const updated = prev.map((t) =>
        t.id === id ? { ...t, ...template } : t
      );
      saveToLocalStorage('userTemplates', updated);
      return updated;
    });
  };

  const deleteUserTemplate = (id: string) => {
    setUserTemplatesState((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveToLocalStorage('userTemplates', updated);
      if (activeTemplateId === id) {
        setActiveTemplateIdState(null);
        saveToLocalStorage('activeTemplateId', null);
      }
      return updated;
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
    getCustomInstruction,
    setCustomInstruction,
    clear: clearGenerated,
  }), [generatedMetadata, getMetadata, setMetadata, getCategories, setFileCategories, getCustomInstruction, setCustomInstruction, clearGenerated]);

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

  // Memoize template settings
  const templateSettingsValue = useMemo(() => ({
    activeTemplateId,
    userTemplates,
    setActiveTemplate,
    addUserTemplate,
    updateUserTemplate,
    deleteUserTemplate,
  }), [activeTemplateId, userTemplates, setActiveTemplate, addUserTemplate, updateUserTemplate, deleteUserTemplate]);

  // Memoize embed settings
  const embedSettingsValue = useMemo(() => ({
    ...embedSettings,
    setEmbedSettings,
  }), [embedSettings, setEmbedSettings]);

  // Memoize file paths
  const filePathsValue = useMemo(() => ({
    filePaths,
    setFilePath,
    getFilePath,
  }), [filePaths, setFilePath, getFilePath]);

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
    templateSettings: templateSettingsValue,
    embedSettings: embedSettingsValue,
    files,
    setFiles,
    removeFile,
    ...filePathsValue,
    thumbnails: thumbnailsValue,
    generated: generatedValue,
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
    templateSettingsValue,
    embedSettingsValue,
    files,
    removeFile,
    filePathsValue,
    thumbnailsValue,
    generatedValue,
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
