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
 * Valid Gemini model prefixes
 */
const VALID_GEMINI_PREFIXES = ['gemini-', 'models/gemini-'];

/**
 * Validates if a model name is a valid Gemini model
 * @param modelName - The model name to validate
 * @returns True if valid, false otherwise
 */
const isValidGeminiModel = (modelName: string): boolean => {
  return VALID_GEMINI_PREFIXES.some(prefix => modelName.startsWith(prefix));
};

/**
 * Creates and configures a Google Gemini model instance
 * @param config - Configuration for the Google provider
 * @returns The configured Google model instance
 */
export const createGoogleModel = (config: GoogleConfig): any => {
  const modelToUse = config.model || DEFAULT_GEMINI_MODEL;

  // Validate model name
  if (!isValidGeminiModel(modelToUse)) {
    console.error(`❌ Invalid Gemini model name: "${modelToUse}"`);
    console.error('⚠️ Valid Gemini models start with "gemini-" (e.g., gemini-2.0-flash-lite, gemini-1.5-pro)');
    console.error(`💡 Using default model instead: ${DEFAULT_GEMINI_MODEL}`);
    console.error('');
    console.error('📌 Common mistake: You might have selected an OpenRouter model (like "gemma-3-27b-it")');
    console.error('   while using the Gemini provider. Please either:');
    console.error('   1. Switch to a valid Gemini model (gemini-2.0-flash-lite, gemini-1.5-pro, etc.)');
    console.error('   2. OR switch to the OpenRouter provider if you want to use Gemma models');

    throw new Error(
      `Invalid model "${modelToUse}" for Gemini provider. ` +
      `Valid models start with "gemini-". ` +
      `Did you mean to use the OpenRouter provider instead?`
    );
  }

  console.log(`🔧 Creating Gemini model: ${modelToUse}`);
  const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
  return google(modelToUse);
};

/**
 * Checks if the provider string matches Google/Gemini
 * @param provider - The provider string to check
 * @returns True if the provider is Google/Gemini
 */
export const isGoogleProvider = (provider?: string): boolean => {
  return provider === 'gemini';
};

