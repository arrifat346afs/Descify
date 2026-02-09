import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Provider = 'openai' | 'gemini' | 'mistral' | 'groq' | 'openrouter';

export type MetadataLimits = {
  titleLimit: number;
  descriptionLimit: number;
  keywordLimit: number;
};

export type MetadataOptions = {
  includePlaceName: boolean;
  autoSelectGenerated: boolean;
  autoScrollOnKeyboardNavigation: boolean;
  titleAvoidWords: string[];
  keywordsAvoidWords: string[];
  descriptionAvoidWords: string[];
};

export type EmbedSettings = {
  enabled: boolean;
  fields: {
    title: boolean;
    description: boolean;
    keywords: boolean;
  };
};

export type ExportSettings = {
  adobeStock: boolean;
  shutterStock: boolean;
};

export type ProcessingMode = 'sequential' | 'parallel';

interface ConfigState {
  api: {
    selectedProvider: Provider | '';
    selectedModel: string;
    apiKeys: Record<Provider, string>;
    requestDelay: number;
    processingMode: ProcessingMode;
    parallelWorkers: number;
  };
  metadataLimits: MetadataLimits;
  metadataOptions: MetadataOptions;
  embedSettings: EmbedSettings;
  exportSettings: ExportSettings;
}

const defaultApiKeys: Record<Provider, string> = {
  openai: '',
  gemini: '',
  mistral: '',
  groq: '',
  openrouter: '',
};

const initialState: ConfigState = {
  api: {
    selectedProvider: '',
    selectedModel: '',
    apiKeys: defaultApiKeys,
    requestDelay: 0,
    processingMode: 'sequential',
    parallelWorkers: 5,
  },
  metadataLimits: {
    titleLimit: 200,
    descriptionLimit: 200,
    keywordLimit: 80,
  },
  metadataOptions: {
    includePlaceName: false,
    autoSelectGenerated: true,
    autoScrollOnKeyboardNavigation: true,
    titleAvoidWords: [],
    keywordsAvoidWords: [],
    descriptionAvoidWords: [],
  },
  embedSettings: {
    enabled: true,
    fields: {
      title: true,
      description: true,
      keywords: true,
    },
  },
  exportSettings: {
    adobeStock: true,
    shutterStock: false,
  },
};

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setSelectedProvider(state, action: PayloadAction<Provider | ''>) {
      state.api.selectedProvider = action.payload;
    },
    setSelectedModel(state, action: PayloadAction<string>) {
      state.api.selectedModel = action.payload;
    },
    setApiKey(state, action: PayloadAction<{ provider: Provider; key: string }>) {
      state.api.apiKeys[action.payload.provider] = action.payload.key;
    },
    setApiKeys(state, action: PayloadAction<Record<Provider, string>>) {
      state.api.apiKeys = action.payload;
    },
    setRequestDelay(state, action: PayloadAction<number>) {
      state.api.requestDelay = action.payload;
    },
    setProcessingMode(state, action: PayloadAction<ProcessingMode>) {
      state.api.processingMode = action.payload;
    },
    setParallelWorkers(state, action: PayloadAction<number>) {
      state.api.parallelWorkers = Math.max(1, Math.min(5, action.payload));
    },
    setMetadataLimits(state, action: PayloadAction<Partial<MetadataLimits>>) {
      state.metadataLimits = { ...state.metadataLimits, ...action.payload };
    },
    setMetadataOptions(state, action: PayloadAction<Partial<MetadataOptions>>) {
      state.metadataOptions = { ...state.metadataOptions, ...action.payload };
    },
    setEmbedSettings(state, action: PayloadAction<Partial<EmbedSettings>>) {
      // Deep merge for embedSettings
      const { enabled, fields } = action.payload;
      if (enabled !== undefined) state.embedSettings.enabled = enabled;
      if (fields) {
        state.embedSettings.fields = { ...state.embedSettings.fields, ...fields };
      }
    },
    setExportSettings(state, action: PayloadAction<Partial<ExportSettings>>) {
      state.exportSettings = { ...state.exportSettings, ...action.payload };
    },
  },
});

export const {
  setSelectedProvider,
  setSelectedModel,
  setApiKey,
  setApiKeys,
  setRequestDelay,
  setProcessingMode,
  setParallelWorkers,
  setMetadataLimits,
  setMetadataOptions,
  setEmbedSettings,
  setExportSettings,
} = configSlice.actions;

export default configSlice.reducer;
