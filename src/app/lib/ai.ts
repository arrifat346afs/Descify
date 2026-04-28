/**
 * AI Module - Main Orchestrator
 * Coordinates AI providers, prompts, API calls, and response parsing
 */

import { generateMetadataPrompt } from './ai/prompts';
import { parseMetadataResponse } from './ai/response-parser';
import { ensureBase64, callAIApi, createVisionMessageContent, callLocalLMStudio, createLocalModelMessageContent } from './ai/api-client';
import { generateAIImage } from './thumbnailGenerator';
// Provider-specific configs can be kept if they have useful constants, but factory functions are no longer needed
import { DEFAULT_OPENAI_MODEL } from './ai/providers/openai';
import { DEFAULT_OPENROUTER_MODEL } from './ai/providers/openrouter';

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
  /** The file path for backend processing (used for videos) */
  filePath?: string;
  fileNames: string[];
  provider?: string;
  model?: string;
  apiKey?: string;
  /** Use local LM Studio model instead of remote API */
  useLocalModel?: boolean;
  /** Local model name (when useLocalModel is true) */
  localModelName?: string;
  limits?: { titleLimit?: number; descriptionLimit?: number; keywordLimit?: number };
  includePlaceName?: boolean;
  customTemplate?: string;
  customInstruction?: string;
  avoidWords?: {
    titleAvoidWords?: string[];
    keywordsAvoidWords?: string[];
    descriptionAvoidWords?: string[];
  };
};

/**
 * Generates metadata for images using AI vision models
 * Uses direct API calls for maximum control over tokens and payload
 */
export const generateMetadata = async (opts: GenerateMetadataOptions): Promise<GeneratedMetadata> => {
  const { file, filePath, thumbnailUrls, provider = 'openai', model, apiKey, useLocalModel, localModelName, limits, includePlaceName, customTemplate, customInstruction, avoidWords } = opts;

  try {
    console.log('🎯 Starting metadata generation with:', {
      provider,
      model,
      useLocalModel,
      localModelName,
      hasApiKey: !!apiKey,
      hasFile: !!file,
      hasFilePath: !!filePath,
    });

    // Generate the prompt
    const textPrompt = generateMetadataPrompt(limits, includePlaceName, customTemplate, customInstruction, avoidWords);

    // Generate high-quality image for AI analysis
    let imageDataUrl: string;

    if (file) {
      console.log('🖼️ Generating optimized image for AI analysis...');
      console.log(`📁 File details: ${file.name}, ${(file.size / 1024).toFixed(2)} KB`);
      
      // Pass filePath for video support
      imageDataUrl = await generateAIImage(file, filePath);
      
      console.log(`✅ Image generated: ${(imageDataUrl.length / 1024).toFixed(2)} KB`);
    } else if (thumbnailUrls && thumbnailUrls.length > 0) {
      console.log('⚠️ Using thumbnail (lower quality) - consider using file parameter');
      console.log(`📏 Thumbnail URL length: ${thumbnailUrls[0].length} chars`);
      imageDataUrl = ensureBase64(thumbnailUrls[0]);
    } else {
      throw new Error('No image provided for metadata generation');
    }

    let responseText: string;

    if (useLocalModel) {
      // Use local LM Studio model - no API key needed, uses file URL directly
      if (!localModelName) {
        throw new Error('No local model selected. Please select a model from Settings.');
      }

      console.log('🏠 Using local LM Studio model:', localModelName);

      const messageContent = createLocalModelMessageContent(textPrompt, imageDataUrl);

      responseText = await callLocalLMStudio({
        model: localModelName,
        messages: [{ role: 'user', content: messageContent }],
      });
    } else {
      // Use remote API model
      if (!apiKey) {
        throw new Error(`No API key provided for ${provider}`);
      }

      // Determine default model if not provided
      let targetModel = model;
      if (!targetModel) {
        if (provider === 'openai') targetModel = DEFAULT_OPENAI_MODEL;
        else if (provider === 'openrouter') targetModel = DEFAULT_OPENROUTER_MODEL;
        else if (provider === 'google') targetModel = 'gemini-1.5-flash';
      }

      // Create message content with text and image
      const messageContent = createVisionMessageContent(textPrompt, imageDataUrl);

      // Call the AI API directly
      responseText = await callAIApi({
        provider,
        apiKey,
        model: targetModel || 'gpt-4-vision-preview',
        messages: [{ role: 'user', content: messageContent }],
      });
    }

    console.log('✅ AI responded. Parsing metadata...');

    const mockResponse = { text: responseText };
    return parseMetadataResponse(mockResponse, limits);

  } catch (err: any) {
    console.error('❌ generateMetadata error:', err);
    throw err;
  }
};
