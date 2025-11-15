/**
 * OpenRouter Provider Module
 * Encapsulates OpenRouter-specific logic and configuration
 * Supports reasoning models like Polaris Alpha
 */

import { createOpenRouter } from '@openrouter/ai-sdk-provider';

export type OpenRouterConfig = {
  apiKey?: string;
  model?: string;
};

/**
 * Default model to use for OpenRouter if none is specified
 */
export const DEFAULT_OPENROUTER_MODEL = 'openrouter/polaris-alpha';

/**
 * Creates and configures an OpenRouter model instance
 * @param config - Configuration for the OpenRouter provider
 * @returns The configured OpenRouter model instance
 */
export const createOpenRouterModel = (config: OpenRouterConfig): any => {
  const openrouter = createOpenRouter({
    apiKey: config.apiKey,
  });
  return openrouter(config.model || DEFAULT_OPENROUTER_MODEL);
};

/**
 * Checks if the provider string matches OpenRouter
 * @param provider - The provider string to check
 * @returns True if the provider is OpenRouter
 */
export const isOpenRouterProvider = (provider?: string): boolean => {
  return provider === 'openrouter';
};

