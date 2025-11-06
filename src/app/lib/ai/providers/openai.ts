/**
 * OpenAI Provider Module
 * Encapsulates OpenAI-specific logic and configuration
 */

import { createOpenAI } from '@ai-sdk/openai';

export type OpenAIConfig = {
  apiKey?: string;
  model?: string;
};

/**
 * Default model to use for OpenAI if none is specified
 */
export const DEFAULT_OPENAI_MODEL = 'gpt-4-vision-preview';

/**
 * Creates and configures an OpenAI model instance
 * @param config - Configuration for the OpenAI provider
 * @returns The configured OpenAI model instance
 */
export const createOpenAIModel = (config: OpenAIConfig): any => {
  const openai = createOpenAI({ apiKey: config.apiKey });
  return openai(config.model || DEFAULT_OPENAI_MODEL);
};

/**
 * Checks if the provider string matches OpenAI
 * @param provider - The provider string to check
 * @returns True if the provider is OpenAI
 */
export const isOpenAIProvider = (provider?: string): boolean => {
  return provider === 'openai';
};

