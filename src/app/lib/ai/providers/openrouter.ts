/**
 * OpenRouter Provider Module
 * Single reusable source for OpenRouter-specific logic.
 * Wraps the shared OpenAI-compatible call with OpenRouter baseUrl + headers.
 * Supports reasoning models like Polaris Alpha.
 */
import { callOpenAICompatible } from "./openai";
import type { AIResponse } from "../http";

export type OpenRouterConfig = {
  apiKey?: string;
  model?: string;
};

/**
 * Default model to use for OpenRouter if none is specified
 */
export const DEFAULT_OPENROUTER_MODEL = 'openrouter/polaris-alpha';

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Checks if the provider string matches OpenRouter
 * @param provider - The provider string to check
 * @returns True if the provider is OpenRouter
 */
export const isOpenRouterProvider = (provider?: string): boolean => {
  return provider === 'openrouter';
};

/**
 * Handles OpenRouter API calls.
 * Reusable: any caller can import this instead of going through api-client.
 */
export async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: any[],
  maxTokens: number = 2048,
  signal?: AbortSignal
): Promise<AIResponse> {
  return callOpenAICompatible(
    OPENROUTER_BASE_URL,
    apiKey,
    model,
    messages,
    true,
    maxTokens,
    signal
  );
}
