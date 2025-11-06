import  { createContext, useContext, useState, ReactNode, useEffect } from 'react';

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
};

type MetadataLimits = {
  titleLimit: number;
  descriptionLimit: number;
  keywordLimit: number;
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

type SettingsContextType = {
  api: ApiSettingsState;
  metadataLimits: MetadataLimits & { setLimits: (l: Partial<MetadataLimits>) => void };
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
    return defaultValue;
  }
};

const saveToLocalStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    console.log(`✓ Saved ${key} to localStorage:`, value);
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
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

  const [files, setFiles] = useState<File[]>([]);
  const [thumbnails, setThumbnails] = useState<ThumbnailData[]>([]);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  const [pendingThumbnailCount, setPendingThumbnailCount] = useState(0);

  const upsert = (t: ThumbnailData) => {
    console.log('🔧 UPSERT called with file:', t.file.name, 'URL:', t.thumbnailUrl);
    setThumbnails((prev) => {
      console.log('🔧 Previous thumbnails count:', prev.length);
      const other = prev.filter((p) => p.file !== t.file);
      console.log('🔧 After filtering (removing duplicates):', other.length);
      const newArray = [...other, t];
      console.log('🔧 New thumbnails array count:', newArray.length);
      return newArray;
    });
    // Decrement pending count
    setPendingThumbnailCount(prev => Math.max(0, prev - 1));
  };
  const clearThumbs = () => {
    console.log('🗑️  Clearing all thumbnails');
    setThumbnails([]);
    setPendingThumbnailCount(0);
    setIsGeneratingThumbnails(false);
  };

  // Track thumbnail state changes
  useEffect(() => {
    console.log('📊 Thumbnails state updated! Count:', thumbnails.length);
    thumbnails.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.file.name} -> ${t.thumbnailUrl.substring(0, 50)}...`);
    });
  }, [thumbnails]);

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

  const getMetadata = (file: File): GeneratedMetadata | undefined => {
    const found = generatedMetadata.find((fm) => fm.file === file);
    return found?.metadata;
  };

  const setMetadata = (file: File, metadata: Partial<GeneratedMetadata>) => {
    setGeneratedMetadata((prev) => {
      const existing = prev.find((fm) => fm.file === file);
      if (existing) {
        // Update existing
        return prev.map((fm) =>
          fm.file === file
            ? { ...fm, metadata: { ...fm.metadata, ...metadata } }
            : fm
        );
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
  };

  const clearGenerated = () => setGeneratedMetadata([]);

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

  const value: SettingsContextType = {
    api: {
      selectedProvider,
      setSelectedProvider,
      selectedModel,
      setSelectedModel,
      apiKeys,
      setApiKey,
      requestDelay,
      setRequestDelay,
    },
    metadataLimits: {
      ...limits,
      setLimits,
    },
    files,
    setFiles,
    thumbnails: {
      items: thumbnails,
      setItems: setThumbnails,
      upsert,
      clear: clearThumbs,
      isGenerating: isGeneratingThumbnails,
      setIsGenerating: setIsGeneratingThumbnails,
      pendingCount: pendingThumbnailCount,
    },
    generated: {
      items: generatedMetadata,
      getMetadata,
      setMetadata,
      clear: clearGenerated,
    },
    generationProgress,
    setGenerationProgress,
    selectedFile,
    setSelectedFile,
    hasAttemptedGeneration,
    setHasAttemptedGeneration,
    categories,
    setCategories,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
