import { useState, useEffect } from 'react';
import { useSettings } from '@/app/contexts/SettingsContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { fetchOpenRouterModels, fetchGeminiModels, type ModelInfo } from '@/app/lib/modelFetcher';
import { ModelSelector } from './ModelSelector';

type Provider = 'openai' | 'gemini' | 'mistral' | 'groq' | 'openrouter';

const ApiSettings = () => {
  const { api } = useSettings();

  // Local state for unsaved changes
  const [localProvider, setLocalProvider] = useState<Provider | ''>(api.selectedProvider);
  const [localModel, setLocalModel] = useState<string>(api.selectedModel);
  const [localApiKeys, setLocalApiKeys] = useState(api.apiKeys);
  const [localRequestDelay, setLocalRequestDelay] = useState(api.requestDelay);
  const [localProcessingMode, setLocalProcessingMode] = useState(api.processingMode);
  const [localParallelWorkers, setLocalParallelWorkers] = useState(api.parallelWorkers);

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  const providers = [
    // { value: 'openai', label: 'OpenAI' },
    { value: 'gemini', label: 'Google' },
    { value: 'openrouter', label: 'OpenRouter' },
  ];

  // Sync local state when context changes (e.g., on mount or external updates)
  useEffect(() => {
    setLocalProvider(api.selectedProvider);
    setLocalModel(api.selectedModel);
    setLocalApiKeys(api.apiKeys);
    setLocalRequestDelay(api.requestDelay);
    setLocalProcessingMode(api.processingMode);
    setLocalParallelWorkers(api.parallelWorkers);
  }, [api.selectedProvider, api.selectedModel, api.apiKeys, api.requestDelay, api.processingMode, api.parallelWorkers]);

  // Detect unsaved changes (excluding API keys and processing mode as they're managed separately)
  useEffect(() => {
    const hasChanges =
      localProvider !== api.selectedProvider ||
      localModel !== api.selectedModel ||
      localRequestDelay !== api.requestDelay ||
      localParallelWorkers !== api.parallelWorkers;

    setHasUnsavedChanges(hasChanges);
  }, [localProvider, localModel, localRequestDelay, localParallelWorkers, api]);

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
          // case 'openai':
          //   fetchedModels = await fetchOpenAIModels(localApiKeys.openai);
          //   break;
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

  const handleSave = () => {
    // Save all changes to context (except processing mode which is applied immediately)
    api.setSelectedProvider(localProvider);
    api.setSelectedModel(localModel);
    api.setRequestDelay(localRequestDelay);
    api.setParallelWorkers(localParallelWorkers);

    toast.success('Settings saved successfully!');

    // Show success indicator
    setShowSavedIndicator(true);

    // Hide indicator after 2 seconds
    setTimeout(() => setShowSavedIndicator(false), 2000);
  };

  const handleCancel = () => {
    // Reset local state to match context (except processing mode which is applied immediately)
    setLocalProvider(api.selectedProvider);
    setLocalModel(api.selectedModel);
    setLocalApiKeys(api.apiKeys);
    setLocalRequestDelay(api.requestDelay);
    setLocalParallelWorkers(api.parallelWorkers);
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
        <Label htmlFor="provider" className="text-base font-medium mb-2">Provider</Label>
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
        <Label htmlFor="model" className="text-base font-medium mb-2">AI Model</Label>
        <ModelSelector
          models={models}
          value={localModel}
          onValueChange={setLocalModel}
          isLoading={isLoadingModels}
          disabled={!localProvider}
          placeholder={
            !localProvider
              ? "Select a provider first"
              : models.length === 0 && !isLoadingModels
                ? "No models available"
                : "Select a model"
          }
        />
      </div>
      <div>
        <Label htmlFor="requestDelay" className="text-base font-medium mb-2">
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
        <p className="text-xs text-gray-400 mt-2">
          Prevents rate limiting. Set to 0 for no delay.
        </p>
      </div>

      {/* Processing Mode Toggle */}
      <div className="pt-2 border-t">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Label htmlFor="processingMode" className="text-base font-medium">
              Batch Processing Mode
            </Label>
            <p className="text-xs text-gray-400 mt-1">
              {localProcessingMode === 'sequential' 
                ? 'Sequential: Process images one at a time (safe for free APIs)'
                : 'Parallel: Process multiple images simultaneously (faster for paid APIs)'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sequential</span>
            <Switch
              id="processingMode"
              checked={localProcessingMode === 'parallel'}
              onCheckedChange={(checked) => {
                const newMode = checked ? 'parallel' : 'sequential';
                setLocalProcessingMode(newMode);
                api.setProcessingMode(newMode); // Apply immediately
                toast.success(`Processing mode changed to ${newMode}`);
              }}
            />
            <span className="text-sm text-gray-500">Parallel</span>
          </div>
        </div>

        {/* Parallel Workers Slider (only show in parallel mode) */}
        {localProcessingMode === 'parallel' && (
          <div className="mt-3 pl-4 border-l-2 border-muted">
            <Label htmlFor="parallelWorkers" className="text-sm font-medium mb-2">
              Parallel Workers: {localParallelWorkers}
            </Label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">1</span>
              <input
                type="range"
                id="parallelWorkers"
                min={1}
                max={5}
                value={localParallelWorkers}
                onChange={(e) => setLocalParallelWorkers(parseInt(e.target.value))}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-400">5</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Number of images to process simultaneously. Lower values are safer for API rate limits.
            </p>
          </div>
        )}
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
