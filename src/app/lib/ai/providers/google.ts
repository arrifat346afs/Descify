/**
 * Google/Gemini Provider Module
 * Single reusable source for all Gemini-specific logic:
 * defaults, validation, request transform, API call, usage parsing.
 */
import { toast } from "sonner";
import {
  postJsonWithTimeout,
  attachUsageToError,
  REMOTE_REQUEST_TIMEOUT_MS,
  type AIResponse,
  type AIUsage,
} from "../http";

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
export const isValidGeminiModel = (modelName: string): boolean => {
  return VALID_GEMINI_PREFIXES.some(prefix => modelName.startsWith(prefix));
};

/**
 * Checks if the provider string matches Google/Gemini.
 * Accepts both 'gemini' (canonical UI value) and 'google' (legacy alias).
 * @param provider - The provider string to check
 * @returns True if the provider is Google/Gemini
 */
export const isGoogleProvider = (provider?: string): boolean => {
  return provider === 'gemini' || provider === 'google';
};

/**
 * Extracts token usage from a Gemini response or error body.
 */
export function parseGeminiUsage(data: any): AIUsage | undefined {
  let parsed = data;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      return undefined;
    }
  }

  const usage = parsed?.usageMetadata;
  if (!usage) return undefined;

  const promptTokens = Number(usage.promptTokenCount ?? NaN);
  const completionTokens = Number(usage.candidatesTokenCount ?? NaN);
  if (Number.isNaN(promptTokens) && Number.isNaN(completionTokens)) return undefined;

  return {
    promptTokens: Number.isNaN(promptTokens) ? 0 : promptTokens,
    completionTokens: Number.isNaN(completionTokens) ? 0 : completionTokens,
  };
}

/**
 * Handles Google Gemini API calls via direct fetch.
 * Reusable: any caller (api-client dispatcher, tests, scripts) can import this.
 */
export async function callGoogleGemini(
  apiKey: string,
  model: string,
  messages: any[],
  maxTokens: number = 2048,
  signal?: AbortSignal
): Promise<AIResponse> {
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
      maxOutputTokens: maxTokens,
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

  const response = await postJsonWithTimeout(
    url,
    payloadString,
    { 'Content-Type': 'application/json' },
    { timeoutMs: REMOTE_REQUEST_TIMEOUT_MS, signal }
  );

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

    throw attachUsageToError(new Error(`Gemini API Error ${response.status}: ${errorBody}`), parseGeminiUsage(errorBody));
  }

  const data = await response.json();

  // Extract text from Gemini response structure
  const candidate = data.candidates?.[0];
  const finishReason = candidate?.finishReason;

  return {
    text: candidate?.content?.parts?.[0]?.text || '',
    // Normalize Gemini's MAX_TOKENS to the OpenAI-style 'length' so callers can treat it uniformly
    finishReason: finishReason === 'MAX_TOKENS' ? 'length' : finishReason,
    usage: parseGeminiUsage(data),
  };
}
