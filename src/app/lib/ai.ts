/**
 * AI Module - Main Orchestrator
 * Coordinates AI providers, prompts, API calls, and response parsing
 */

import { generateMetadataPrompt } from './ai/prompts';
import { parseMetadataResponse} from './ai/response-parser';
import { ensureBase64, callAIApi, createVisionMessageContent } from './ai/api-client';
import { createOpenAIModel, isOpenAIProvider } from './ai/providers/openai';
import { createGoogleModel, isGoogleProvider } from './ai/providers/google';
import { createOpenRouterModel, isOpenRouterProvider } from './ai/providers/openrouter';
import { generateAIImage } from './thumbnailGenerator';

export type GeneratedMetadata = {
  title: string;
  description: string;
  keywords: string; // comma separated
};

export type GenerateMetadataOptions = {
  /** @deprecated Use `file` instead for better AI quality */
  thumbnailUrls?: string[];
  /** The file to generate metadata for - will create HQ image on-demand */
  file?: File;
  fileNames: string[];
  provider?: string;
  model?: string;
  apiKey?: string;
  limits?: { titleLimit?: number; descriptionLimit?: number; keywordLimit?: number };
  includePlaceName?: boolean;
  customTemplate?: string;
  customInstruction?: string;
};

/**
 * Initializes the appropriate AI provider model based on the provider string
 * @param provider - The provider name (openai, gemini, openrouter, etc.)
 * @param apiKey - The API key for the provider
 * @param model - The specific model to use (optional)
 * @returns The initialized model instance
 */
const initializeModel = (provider?: string, apiKey?: string, model?: string): any => {
  if (isOpenAIProvider(provider)) {
    return createOpenAIModel({ apiKey, model });
  } else if (isGoogleProvider(provider)) {
    return createGoogleModel({ apiKey, model });
  } else if (isOpenRouterProvider(provider)) {
    return createOpenRouterModel({ apiKey, model });
  } else {
    // Fallback to OpenAI if no provider specified
    return createOpenAIModel({ apiKey, model });
  }
};

/**
 * Generates metadata for images using AI vision models
 *
 * Uses high-quality image generation on-demand for better AI analysis.
 * If `file` is provided, generates a 768px high-quality image for AI.
 * Falls back to thumbnailUrls for backwards compatibility.
 *
 * @param opts - Options for metadata generation
 * @returns Generated metadata including title, description, and keywords
 */
export const generateMetadata = async (opts: GenerateMetadataOptions): Promise<GeneratedMetadata> => {
  const { file, thumbnailUrls, provider, model, apiKey, limits, includePlaceName, customTemplate, customInstruction } = opts;

  try {
    console.log('🎯 Starting metadata generation with:', {
      provider,
      model,
      hasApiKey: !!apiKey,
      hasFile: !!file,
      hasThumbnails: !!thumbnailUrls?.length,
    });

    // Generate the prompt
    const textPrompt = generateMetadataPrompt(limits, includePlaceName, customTemplate, customInstruction);
    console.log('📝 Generated prompt:', textPrompt.substring(0, 200) + '...');

    // Initialize the appropriate provider model
    console.log('🔧 Initializing model...');
    const modelInstance = initializeModel(provider, apiKey, model);
    console.log('✅ Model initialized');

    // Generate high-quality image for AI analysis
    let imageDataUrl: string;

    if (file) {
      // New: Generate HQ image on-demand (768px, 85% quality)
      console.log('🖼️ Generating high-quality image for AI analysis...');
      imageDataUrl = await generateAIImage(file);
      console.log('✅ HQ image generated for AI');
    } else if (thumbnailUrls && thumbnailUrls.length > 0) {
      // Fallback: Use provided thumbnail (backwards compatibility)
      console.log('⚠️ Using thumbnail (lower quality) - consider using file parameter');
      imageDataUrl = ensureBase64(thumbnailUrls[0]);
    } else {
      throw new Error('No image provided for metadata generation');
    }

    // Create message content with text and image
    const messageContent = createVisionMessageContent(textPrompt, imageDataUrl);

    // Call the AI API
    const response = await callAIApi({
      model: modelInstance,
      messages: [{ role: 'user', content: messageContent }],
    });

    // Parse and validate the response
    return parseMetadataResponse(response, limits);
  } catch (err: any) {
    console.error('❌ generateMetadata error:', err);
    console.error('📋 Error context:', {
      provider,
      model,
      errorMessage: err.message,
      errorName: err.name,
    });
    throw err;
  }
};
