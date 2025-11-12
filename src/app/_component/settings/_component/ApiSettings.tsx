import { useState, useEffect } from 'react';
import { useSettings } from '@/app/contexts/SettingsContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { fetchOpenRouterModels, fetchOpenAIModels, fetchGeminiModels, type ModelInfo } from '@/app/lib/modelFetcher';

type Provider = 'openai' | 'gemini' | 'mistral' | 'groq' | 'openrouter';

const ApiSettings = () => {
  const { api } = useSettings();
  const selectedProvider = api.selectedProvider;
  const setSelectedProvider = api.setSelectedProvider;
  const selectedModel = api.selectedModel;
  const setSelectedModel = api.setSelectedModel;
  const apiKeys = api.apiKeys;
  const setApiKey = api.setApiKey;

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const providers = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'gemini', label: 'Google' },
    { value: 'openrouter', label: 'OpenRouter' },
  ];

  // Fetch models when provider changes
  useEffect(() => {
    const loadModels = async () => {
      if (!selectedProvider) {
        setModels([]);
        return;
      }

      setIsLoadingModels(true);
      try {
        let fetchedModels: ModelInfo[] = [];

        switch (selectedProvider) {
          case 'openai':
            fetchedModels = await fetchOpenAIModels(apiKeys.openai);
            break;
          case 'gemini':
            fetchedModels = await fetchGeminiModels(apiKeys.gemini);
            break;
          case 'openrouter':
            fetchedModels = await fetchOpenRouterModels(apiKeys.openrouter);
            break;
          default:
            fetchedModels = [];
        }

        setModels(fetchedModels);
      } catch (error) {
        console.error('Error loading models:', error);
        toast.error('Failed to load models');
        setModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadModels();
  }, [selectedProvider, apiKeys]);

  const handleApiKeyChange = (provider: Provider, value: string) => {
    if (provider === 'openai' || provider === 'gemini' || provider === 'mistral' || provider === 'groq' || provider === 'openrouter') {
      setApiKey(provider, value);
      toast("API Key saved!");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="provider">Provider</Label>
  <Select onValueChange={(val) => setSelectedProvider(val as Provider)} value={selectedProvider || undefined}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((provider) => (
              <SelectItem key={provider.value} value={provider.value}>
                {provider.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="model">AI Model</Label>
        <Select
          onValueChange={setSelectedModel}
          value={selectedModel || undefined}
          disabled={!selectedProvider || isLoadingModels}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={
              isLoadingModels
                ? "Loading models..."
                : selectedProvider
                  ? "Select a model"
                  : "Select a provider first"
            } />
          </SelectTrigger>
          <SelectContent>
            {models.length > 0 ? (
              models.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-models" disabled>
                {isLoadingModels ? "Loading..." : "No models available"}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      <div>
          <Label htmlFor="apiKey">
            API Key {selectedProvider ? `for ${providers.find(p => p.value === selectedProvider)?.label}` : ''}
          </Label>
          <Input
            type="password"
            id="apiKey"
            value={selectedProvider ? apiKeys[selectedProvider] : ''}
            placeholder={selectedProvider ? `Enter ${providers.find(p => p.value === selectedProvider)?.label} API Key` : 'Select a provider first'}
            onChange={(e) => {
              if (selectedProvider) {
                handleApiKeyChange(selectedProvider, e.target.value);
              }
            }}
          />
      </div>

      <div>
          <Label htmlFor="requestDelay">
            Request Delay (seconds)
          </Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              id="requestDelay"
              value={api.requestDelay / 1000}
              placeholder="1"
              min={0}
              max={10}
              step={0.5}
              onChange={(e) => {
                const seconds = parseFloat(e.target.value || '0');
                api.setRequestDelay(seconds * 1000);
              }}
              className="w-24"
            />
            <span className="text-sm text-gray-500">
              Wait {(api.requestDelay / 1000).toFixed(1)}s between AI requests
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Prevents rate limiting. Set to 0 for no delay.
          </p>
      </div>
    </div>
  );
}

export default ApiSettings;
