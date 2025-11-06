// import { useState } from 'react';
import { useSettings } from '@/app/contexts/SettingsContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type Provider = 'openai' | 'gemini' | 'mistral' | 'groq' | 'openrouter';

const ApiSettings = () => {
  const { api } = useSettings();
  const selectedProvider = api.selectedProvider;
  const setSelectedProvider = api.setSelectedProvider;
  const selectedModel = api.selectedModel;
  const setSelectedModel = api.setSelectedModel;
  const apiKeys = api.apiKeys;
  const setApiKey = api.setApiKey;

  const providers = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'gemini', label: 'Google' },
    { value: 'mistral', label: 'Mistral' },
    { value: 'groq', label: 'Groq' },
    { value: 'openrouter', label: 'OpenRouter' },
  ];

  const openaiModels = [
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
  ];

  const googleModels = [
    { value: 'gemini-pro', label: 'Gemini Pro' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
  ];

  const mistralModels = [
    { value: 'mistral-small-latest', label: 'Mistral Small Latest' },
    { value: 'mistral-medium-latest', label: 'Mistral Medium Latest' },
  ];

  const groqModels = [
    { value: 'llama2-70b-4096', label: 'Llama2 70B 4096' },
  ];

  const openrouterModels = [
    { value: 'openai/gpt-3.5-turbo', label: 'OpenAI GPT-3.5 Turbo' },
    { value: 'google/gemini-pro', label: 'Google Gemini Pro' },
  ];

  const handleApiKeyChange = (provider: Provider, value: string) => {
    setApiKey(provider, value);
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
  <Select onValueChange={setSelectedModel} value={selectedModel || undefined}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {selectedProvider === 'openai' &&
              openaiModels.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            {selectedProvider === 'gemini' &&
              googleModels.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            {selectedProvider === 'mistral' &&
              mistralModels.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            {selectedProvider === 'groq' &&
              groqModels.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            {selectedProvider === 'openrouter' &&
              openrouterModels.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
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

      <div className="flex justify-end space-x-2">
        <Button variant="secondary">Clear</Button>
        <Button>Save & Close</Button>
      </div>
    </div>
  );
}

export default ApiSettings;
