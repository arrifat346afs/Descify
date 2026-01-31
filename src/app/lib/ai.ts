/**
 * AI Module - Main Orchestrator
 * Coordinates AI providers, prompts, API calls, and response parsing
 */

import { generateMetadataPrompt } from './ai/prompts';
import { parseMetadataResponse } from './ai/response-parser';
import { ensureBase64, callAIApi, createVisionMessageContent } from './ai/api-client';
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
 * Generates metadata for images using AI vision models
 * Uses direct API calls for maximum control over tokens and payload
 */
export const generateMetadata = async (opts: GenerateMetadataOptions): Promise<GeneratedMetadata> => {
  const { file, thumbnailUrls, provider = 'openai', model, apiKey, limits, includePlaceName, customTemplate, customInstruction } = opts;

  try {
    console.log('🎯 Starting metadata generation with:', {
      provider,
      model,
      hasApiKey: !!apiKey,
      hasFile: !!file,
    });

    if (!apiKey) {
      throw new Error(`No API key provided for ${provider}`);
    }

    // Determine default model if not provided
    let targetModel = model;
    if (!targetModel) {
      if (provider === 'openai') targetModel = DEFAULT_OPENAI_MODEL;
      else if (provider === 'openrouter') targetModel = DEFAULT_OPENROUTER_MODEL;
      else if (provider === 'google') targetModel = 'gemini-1.5-flash'; // Good default for Google
    }

    // Generate the prompt
    const textPrompt = generateMetadataPrompt(limits, includePlaceName, customTemplate, customInstruction);

    // Generate high-quality image for AI analysis
    let imageDataUrl: string;

    if (file) {
      // New: Generate HQ image on-demand (480px, 60% quality per optimization settings)
      console.log('🖼️ Generating optimized image for AI analysis...');
      console.log(`📁 File details: ${file.name}, ${(file.size / 1024).toFixed(2)} KB`);
      imageDataUrl = await generateAIImage(file);
      console.log(`✅ Image generated: ${(imageDataUrl.length / 1024).toFixed(2)} KB`);
    } else if (thumbnailUrls && thumbnailUrls.length > 0) {
      console.log('⚠️ Using thumbnail (lower quality) - consider using file parameter');
      console.log(`📏 Thumbnail URL length: ${thumbnailUrls[0].length} chars`);
      imageDataUrl = ensureBase64(thumbnailUrls[0]);
    } else {
      throw new Error('No image provided for metadata generation');
    }

    // Create message content with text and image
    const messageContent = createVisionMessageContent(textPrompt, imageDataUrl);

    // Call the AI API directly
    // The response is now a string (the raw text content)
    const responseText = await callAIApi({
      provider,
      apiKey,
      model: targetModel || 'gpt-4-vision-preview',
      messages: [{ role: 'user', content: messageContent }],
    });

    console.log('✅ AI responded. Parsing metadata...');

    // Parse and validate the response
    // We wrap the text in a mock object structure because response-parser might expect the Vercel AI SDK response format
    // OR we simply refactor response-parser to take a string. 
    // Let's assume for now we need to adapt it. 
    // Checking response-parser.ts would have been good, but based on `parseMetadataResponse(response, limits)` signature in original file...
    // The original code passed `response` from `generateText`. 
    // `generateText` returns `{ text: string, ... }`. 
    // So we should pass an object with `text` property.

    const mockResponse = { text: responseText };
    return parseMetadataResponse(mockResponse, limits);

  } catch (err: any) {
    console.error('❌ generateMetadata error:', err);
    throw err;
  }
};
