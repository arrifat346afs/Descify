import { useState, useEffect } from 'react';
import { useSettings } from '@/app/contexts/SettingsContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { fetchOpenRouterModels, fetchOpenAIModels, fetchGeminiModels, type ModelInfo } from '@/app/lib/modelFetcher';

type Provider = 'openai' | 'gemini' | 'mistral' | 'groq' | 'openrouter';

const ApiSettings = () => {
  const { api } = useSettings();

  // Local state for unsaved changes
  const [localProvider, setLocalProvider] = useState<Provider | ''>(api.selectedProvider);
  const [localModel, setLocalModel] = useState<string>(api.selectedModel);
  const [localApiKeys, setLocalApiKeys] = useState(api.apiKeys);
  const [localRequestDelay, setLocalRequestDelay] = useState(api.requestDelay);

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  const providers = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'gemini', label: 'Google' },
    { value: 'openrouter', label: 'OpenRouter' },
  ];

  // Sync local state when context changes (e.g., on mount or external updates)
  useEffect(() => {
    setLocalProvider(api.selectedProvider);
    setLocalModel(api.selectedModel);
    setLocalApiKeys(api.apiKeys);
    setLocalRequestDelay(api.requestDelay);
  }, [api.selectedProvider, api.selectedModel, api.apiKeys, api.requestDelay]);

  // Detect unsaved changes
  useEffect(() => {
    const hasChanges =
      localProvider !== api.selectedProvider ||
      localModel !== api.selectedModel ||
      JSON.stringify(localApiKeys) !== JSON.stringify(api.apiKeys) ||
      localRequestDelay !== api.requestDelay;

    setHasUnsavedChanges(hasChanges);
  }, [localProvider, localModel, localApiKeys, localRequestDelay, api]);

  // Fetch models when local provider changes
  useEffect(() => {
    const loadModels = async () => {
      if (!localProvider) {
        setModels([]);
        return;
      }

      setIsLoadingModels(true);
      try {
        let fetchedModels: ModelInfo[] = [];

        switch (localProvider) {
          case 'openai':
            fetchedModels = await fetchOpenAIModels(localApiKeys.openai);
            break;
          case 'gemini':
            fetchedModels = await fetchGeminiModels(localApiKeys.gemini);
            break;
          case 'openrouter':
            fetchedModels = await fetchOpenRouterModels(localApiKeys.openrouter);
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
  }, [localProvider, localApiKeys]);

  const handleLocalApiKeyChange = (provider: Provider, value: string) => {
    setLocalApiKeys(prev => ({ ...prev, [provider]: value }));
  };

  const handleSave = () => {
    // Save all changes to context
    // Note: Each setter in the context will show its own toast
    api.setSelectedProvider(localProvider);
    api.setSelectedModel(localModel);

    // Save API keys only if changed
    Object.entries(localApiKeys).forEach(([provider, key]) => {
      if (key !== api.apiKeys[provider as Provider]) {
        api.setApiKey(provider as Provider, key);
      }
    });

    api.setRequestDelay(localRequestDelay);

    // Show success indicator
    setShowSavedIndicator(true);

    // Hide indicator after 2 seconds
    setTimeout(() => setShowSavedIndicator(false), 2000);
  };

  const handleCancel = () => {
    // Reset local state to match context
    setLocalProvider(api.selectedProvider);
    setLocalModel(api.selectedModel);
    setLocalApiKeys(api.apiKeys);
    setLocalRequestDelay(api.requestDelay);
    toast.info('Changes discarded');
  };

  return (
    <div className="space-y-4">
      {/* Unsaved changes indicator */}
      {hasUnsavedChanges && (
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">
            Unsaved Changes
          </Badge>
          <span className="text-sm text-yellow-600 dark:text-yellow-400">
            You have unsaved changes. Click "Save Settings" to apply them.
          </span>
        </div>
      )}

      {/* Saved indicator */}
      {showSavedIndicator && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
          <Badge variant="outline" className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
            ✓ Saved
          </Badge>
          <span className="text-sm text-green-600 dark:text-green-400">
            Settings saved successfully!
          </span>
        </div>
      )}

      <div>
        <Label htmlFor="provider">Provider</Label>
        <Select onValueChange={(val) => setLocalProvider(val as Provider)} value={localProvider || undefined}>
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
          onValueChange={setLocalModel}
          value={localModel || undefined}
          disabled={!localProvider || isLoadingModels}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={
              isLoadingModels
                ? "Loading models..."
                : localProvider
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
          API Key {localProvider ? `for ${providers.find(p => p.value === localProvider)?.label}` : ''}
        </Label>
        <Input
          type="password"
          id="apiKey"
          value={localProvider ? localApiKeys[localProvider] : ''}
          placeholder={localProvider ? `Enter ${providers.find(p => p.value === localProvider)?.label} API Key` : 'Select a provider first'}
          onChange={(e) => {
            if (localProvider) {
              handleLocalApiKeyChange(localProvider, e.target.value);
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
            value={localRequestDelay / 1000}
            placeholder="1"
            min={0}
            max={10}
            step={0.5}
            onChange={(e) => {
              const seconds = parseFloat(e.target.value || '0');
              setLocalRequestDelay(seconds * 1000);
            }}
            className="w-24"
          />
          <span className="text-sm text-gray-500">
            Wait {(localRequestDelay / 1000).toFixed(1)}s between AI requests
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Prevents rate limiting. Set to 0 for no delay.
        </p>
      </div>

      {/* Save and Cancel buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          onClick={handleSave}
          disabled={!hasUnsavedChanges}
          className="flex-1"
        >
          Save Settings
        </Button>
        <Button
          onClick={handleCancel}
          variant="outline"
          disabled={!hasUnsavedChanges}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default ApiSettings;
