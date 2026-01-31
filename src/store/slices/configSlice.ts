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
};

export type EmbedSettings = {
  enabled: boolean;
  fields: {
    title: boolean;
    description: boolean;
    keywords: boolean;
  };
};

interface ConfigState {
  api: {
    selectedProvider: Provider | '';
    selectedModel: string;
    apiKeys: Record<Provider, string>;
    requestDelay: number;
  };
  metadataLimits: MetadataLimits;
  metadataOptions: MetadataOptions;
  embedSettings: EmbedSettings;
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
    requestDelay: 1000,
  },
  metadataLimits: {
    titleLimit: 200,
    descriptionLimit: 200,
    keywordLimit: 80,
  },
  metadataOptions: {
    includePlaceName: false,
    autoSelectGenerated: true,
  },
  embedSettings: {
    enabled: true,
    fields: {
      title: true,
      description: true,
      keywords: true,
    },
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
  },
});

export const {
  setSelectedProvider,
  setSelectedModel,
  setApiKey,
  setApiKeys,
  setRequestDelay,
  setMetadataLimits,
  setMetadataOptions,
  setEmbedSettings,
} = configSlice.actions;

export default configSlice.reducer;
