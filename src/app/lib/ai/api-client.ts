/**
 * AI API Client Module
 * Handles raw API calls and HTTP requests to AI providers directly via fetch
 * Removes dependency on Vercel AI SDK for more control over payload and tokens
 */
import { toast } from "sonner";

export type MessageContent = {
  type: 'text' | 'image_url'; // OpenAI/OpenRouter standard
  text?: string;
  image_url?: {
    url: string;
  };
};

export type GenerateTextOptions = {
  provider: string;
  apiKey: string;
  model: string;
  messages: any[];
};

/**
 * Calls the AI API with the provided options using direct fetch
 */
export const callAIApi = async (options: GenerateTextOptions): Promise<string> => {
  const { provider, apiKey, model, messages } = options;
  console.log('🚀 Sending to AI (Direct Fetch)...', { provider, model });

  try {
    if (provider === 'google') {
      return await callGoogleGemini(apiKey, model, messages);
    } else {
      // OpenAI and OpenRouter share similar chat completions API structure
      const baseUrl = provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1'
        : 'https://api.openai.com/v1';

      return await callOpenAICompatible(baseUrl, apiKey, model, messages, provider === 'openrouter');
    }
  } catch (error: any) {
    console.error('❌ AI API call failed:', error);
    throw new Error(`AI API call failed: ${error.message || error}`);
  }
};

/**
 * Handles OpenAI and OpenRouter API calls
 */
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: any[],
  isOpenRouter: boolean
): Promise<string> {
  // Transform messages if needed (Vercel SDK format to OpenAI format)
  // Our internal format is already close, but let's ensure image format is correct
  // OpenAI expects content: [{type: "text", text: "..."}, {type: "image_url", image_url: {url: "..."}}]

  const payload = {
    model: model,
    messages: messages,
    max_tokens: 1000,
    temperature: 0.7,
  };

  // Log payload size for inspection
  const payloadString = JSON.stringify(payload);
  console.log(`📦 Payload size: ${(payloadString.length / 1024).toFixed(2)} KB`);
  
  // Extract and analyze image portion of payload
  const imageMatch = payloadString.match(/"image_url":\s*{\s*"url":\s*"[^"]*"/);
  if (imageMatch) {
    const base64Match = payloadString.match(/base64,([^"]*)/);
    const imageBase64Size = base64Match ? base64Match[1].length : 0;
    const imageKB = imageBase64Size / 1024;
    
    console.log(`🖼️ Image Analysis:`);
    console.log(`  Image base64 size: ${imageKB.toFixed(2)} KB`);
    console.log(`  Image base64 chars: ${imageBase64Size}`);
    console.log(`  Expected 480p JPEG: ~50-100 KB before base64`);
    console.log(`  Your image: ${(imageKB * 0.75).toFixed(2)} KB before base64`);
    
    // More realistic token estimation for vision models
    // Vision models count images differently than text
    // Rough estimate: ~1 token per 1000 pixels for base64 images
    const estimatedImagePixels = 480 * 480; // Should be 480p
    const estimatedImageTokens = Math.ceil(estimatedImagePixels / 1000); // ~230 tokens for 480p
    
    // Text tokens in payload (excluding image data)
    const textPortion = payloadString.replace(/"url":\s*"[^"]*"/, '"url": "[IMAGE_DATA]"');
    const textTokens = Math.ceil(textPortion.length / 4);
    
    const totalEstimatedTokens = textTokens + estimatedImageTokens;
    
    console.log(`🔢 Token Estimation (Vision Model):`);
    console.log(`  Text tokens: ~${textTokens}`);
    console.log(`  Image tokens: ~${estimatedImageTokens} (for ${480}p)`);
    console.log(`  Total estimated: ~${totalEstimatedTokens}`);
    console.log(`  Old wrong calculation: ~${Math.ceil(payloadString.length / 4)}`);
    
    if (imageKB > 150) {
      console.warn(`❌ IMAGE TOO LARGE: ${(imageKB * 0.75).toFixed(2)} KB (should be 50-100 KB)`);
    }
    
    // Warning threshold adjusted for vision models
    if (totalEstimatedTokens > 1000) {
      console.warn(`⚠️ High token usage detected: ~${totalEstimatedTokens} tokens (vision model)`);
    }
  } else {
    console.log(`🔢 Est. Input Tokens (char/4): ~${Math.ceil(payloadString.length / 4)}`);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  if (isOpenRouter) {
    headers['HTTP-Referer'] = 'https://descify.app'; // Optional: for OpenRouter rankings
    headers['X-Title'] = 'Descify'; // Optional
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: payloadString
  });

  if (!response.ok) {
    const errorBody = await response.text();
    
    // Check for model capability errors
    const isModelCapabilityError = 
      errorBody.includes('does not support image input') ||
      errorBody.includes('model does not support') ||
      errorBody.includes('vision') ||
      errorBody.includes('image modality') ||
      errorBody.includes('media type') ||
      response.status === 400;
    
    if (isModelCapabilityError) {
      const errorMessage = "The selected model does not support image input. Please select a vision-capable model from Settings.";
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Handles Google Gemini API calls
 */
async function callGoogleGemini(apiKey: string, model: string, messages: any[]): Promise<string> {
  // Transform messages to Gemini format
  // Gemini expects: { parts: [{ text: "..." }, { inline_data: { mime_type: "...", data: "..." } }] }

  const contents = messages.map(msg => {
    const parts = [];

    if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === 'text') {
          parts.push({ text: part.text });
        } else if (part.type === 'image_url') {
          // Extract base64 and mime type from data URL
          const matches = part.image_url.url.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
          if (matches) {
            parts.push({
              inline_data: {
                mime_type: matches[1],
                data: matches[2]
              }
            });
          }
        }
      }
    } else {
      parts.push({ text: msg.content });
    }

    return {
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts
    };
  });

  const payload = {
    contents,
    generationConfig: {
      maxOutputTokens: 1000,
      temperature: 0.7,
    }
  };

  // Log payload size
  const payloadString = JSON.stringify(payload);
  console.log(`📦 Gemini Payload size: ${(payloadString.length / 1024).toFixed(2)} KB`);
  
  // Add warning for high token usage in Gemini
  if (payloadString.length > 6000) { // ~1500 tokens
    console.warn(`⚠️ High Gemini token usage detected: ${Math.ceil(payloadString.length / 4)} tokens (image may be larger than 480p)`);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: payloadString
  });

  if (!response.ok) {
    const errorBody = await response.text();
    
    // Check for model capability errors
    const isModelCapabilityError = 
      errorBody.includes('does not support image input') ||
      errorBody.includes('model does not support') ||
      errorBody.includes('vision') ||
      errorBody.includes('image modality') ||
      errorBody.includes('media type') ||
      response.status === 400;
    
    if (isModelCapabilityError) {
      const errorMessage = "The selected model does not support image input. Please select a vision-capable model from Settings.";
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    throw new Error(`Gemini API Error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();

  // Extract text from Gemini response structure
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Creates a message content array for vision-based metadata generation
 * Compatible with OpenAI/OpenRouter structure
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
      type: 'image_url', // Standard name
      image_url: {
        url: imageDataUrl,
      },
    },
  ];
};

/**
 * Helper to validate/fix base64 strings if needed
 */
export const ensureBase64 = (url: string): string => {
  if (url.startsWith('data:')) return url;
  throw new Error('Expected data URL');
};
