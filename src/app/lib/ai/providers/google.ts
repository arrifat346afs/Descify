/**
 * Google/Gemini Provider Module
 * Encapsulates Google Gemini-specific logic and configuration
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';

export type GoogleConfig = {
  apiKey?: string;
  model?: string;
};

/**
 * Default model to use for Google Gemini if none is specified
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash-lite';

/**
 * Creates and configures a Google Gemini model instance
 * @param config - Configuration for the Google provider
 * @returns The configured Google model instance
 */
export const createGoogleModel = (config: GoogleConfig): any => {
  const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
  return google(config.model || DEFAULT_GEMINI_MODEL);
};

/**
 * Checks if the provider string matches Google/Gemini
 * @param provider - The provider string to check
 * @returns True if the provider is Google/Gemini
 */
export const isGoogleProvider = (provider?: string): boolean => {
  return provider === 'gemini';
};

