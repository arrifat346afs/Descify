/**
 * AI Module - Main Orchestrator
 * Coordinates AI providers, prompts, API calls, and response parsing
 */

import { generateMetadataPrompt } from './ai/prompts';
import { parseMetadataResponse} from './ai/response-parser';
import { ensureBase64, callAIApi, createVisionMessageContent } from './ai/api-client';
import { createOpenAIModel, isOpenAIProvider } from './ai/providers/openai';
import { createGoogleModel, isGoogleProvider } from './ai/providers/google';

export type GeneratedMetadata = {
  title: string;
  description: string;
  keywords: string; // comma separated
};

export type GenerateMetadataOptions = {
  thumbnailUrls: string[];
  fileNames: string[];
  provider?: string;
  model?: string;
  apiKey?: string;
  limits?: { titleLimit?: number; descriptionLimit?: number; keywordLimit?: number };
  includePlaceName?: boolean;
};

/**
 * Initializes the appropriate AI provider model based on the provider string
 * @param provider - The provider name (openai, gemini, etc.)
 * @param apiKey - The API key for the provider
 * @param model - The specific model to use (optional)
 * @returns The initialized model instance
 */
const initializeModel = (provider?: string, apiKey?: string, model?: string): any => {
  if (isOpenAIProvider(provider)) {
    return createOpenAIModel({ apiKey, model });
  } else if (isGoogleProvider(provider)) {
    return createGoogleModel({ apiKey, model });
  } else {
    // Fallback to OpenAI if no provider specified
    return createOpenAIModel({ apiKey, model });
  }
};

/**
 * Generates metadata for images using AI vision models
 * @param opts - Options for metadata generation
 * @returns Generated metadata including title, description, and keywords
 */
export const generateMetadata = async (opts: GenerateMetadataOptions): Promise<GeneratedMetadata> => {
  const { thumbnailUrls,  provider, model, apiKey, limits, includePlaceName } = opts;

  try {
    // Generate the prompt
    const textPrompt = generateMetadataPrompt(limits, includePlaceName);
    console.log('Generated prompt:', textPrompt);
    // Initialize the appropriate provider model
    const modelInstance = initializeModel(provider, apiKey, model);

    // Thumbnails are already optimized base64 data URLs from the browser
    console.log('Using optimized thumbnail (already base64)...');
    const imageDataUrl = ensureBase64(thumbnailUrls[0]);

    // Create message content with text and image
    const messageContent = createVisionMessageContent(textPrompt, imageDataUrl);

    // Call the AI API
    const response = await callAIApi({
      model: modelInstance,
      messages: [{ role: 'user', content: messageContent }],
    });

    // Parse and validate the response
    return parseMetadataResponse(response, limits);
  } catch (err) {
    console.error('generateMetadata error', err);
    throw err;
  }
};
