/**
 * AI API Client Module
 * Handles raw API calls and HTTP requests to AI providers
 */

import { generateText } from 'ai';

export type MessageContent = {
  type: 'text' | 'image';
  text?: string;
  image?: string;
};

export type GenerateTextOptions = {
  model: any; // The AI SDK model instance
  messages: any[]; // Using any[] to match the AI SDK's ModelMessage type
};

/**
 * Helper function to ensure we have base64 data URL
 * @param url - The URL to validate
 * @returns The validated data URL
 * @throws Error if the URL is not a data URL
 */
export const ensureBase64 = (url: string): string => {
  // If it's already a data URL (data:image/jpeg;base64,...), return as-is
  if (url.startsWith('data:')) {
    return url;
  }

  // Otherwise, it's a blob URL or file URL - this shouldn't happen with our new system
  throw new Error('Expected data URL but got: ' + url.substring(0, 50));
};

/**
 * Calls the AI API with the provided options
 * @param options - The options for the API call
 * @returns The response from the AI API
 */
export const callAIApi = async (options: GenerateTextOptions): Promise<any> => {
  console.log('Sending to AI...');
  
  const response = await generateText({
    model: options.model,
    messages: options.messages,
  });

  return response;
};

/**
 * Creates a message content array for vision-based metadata generation
 * @param prompt - The text prompt
 * @param imageDataUrl - The base64 data URL of the image
 * @returns The message content array
 */
export const createVisionMessageContent = (
  prompt: string,
  imageDataUrl: string
): MessageContent[] => {
  return [
    {
      type: 'text',
      text: prompt,
    },
    {
      type: 'image',
      image: imageDataUrl,
    },
  ];
};

