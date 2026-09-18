/**
 * OpenAI Provider Module
 * Single reusable source for OpenAI-specific logic:
 * defaults, request call, usage parsing.
 */
import { toast } from "sonner";
import {
  postJsonWithTimeout,
  attachUsageToError,
  REMOTE_REQUEST_TIMEOUT_MS,
  type AIResponse,
  type AIUsage,
} from "../http";

export type OpenAIConfig = {
  apiKey?: string;
  model?: string;
};

/**
 * Default model to use for OpenAI if none is specified
 */
export const DEFAULT_OPENAI_MODEL = 'gpt-4-vision-preview';

/**
 * Checks if the provider string matches OpenAI
 * @param provider - The provider string to check
 * @returns True if the provider is OpenAI
 */
export const isOpenAIProvider = (provider?: string): boolean => {
  return provider === 'openai';
};

/**
 * Extracts token usage from an OpenAI/OpenRouter-compatible response or error body.
 * OpenRouter reports the exact billed cost in usage.cost (USD); total_cost is
 * also accepted as a fallback.
 */
export function parseOpenAIUsage(data: any, isOpenRouter = false): AIUsage | undefined {
  let parsed = data;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      return undefined;
    }
  }

  const usage = parsed?.usage;
  if (!usage) return undefined;

  const promptTokens = Number(usage.prompt_tokens ?? usage.promptTokens ?? NaN);
  const completionTokens = Number(usage.completion_tokens ?? usage.completionTokens ?? NaN);
  if (Number.isNaN(promptTokens) && Number.isNaN(completionTokens)) return undefined;

  // OpenRouter returns the exact billed cost in usage.cost (and usage.total_cost).
  const rawCost = isOpenRouter
    ? (usage.cost ?? usage.total_cost)
    : (usage.total_cost ?? usage.cost);
  const totalCost = rawCost != null ? Number(rawCost) : undefined;

  return {
    promptTokens: Number.isNaN(promptTokens) ? 0 : promptTokens,
    completionTokens: Number.isNaN(completionTokens) ? 0 : completionTokens,
    totalCost: totalCost != null && !Number.isNaN(totalCost) ? totalCost : undefined,
  };
}

/**
 * Handles OpenAI (and OpenAI-compatible) chat-completions API calls.
 * Reusable: OpenRouter wraps this with its own baseUrl + headers.
 */
export async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: any[],
  isOpenRouter: boolean,
  maxTokens: number = 2048,
  signal?: AbortSignal
): Promise<AIResponse> {
  // Transform messages if needed (Vercel SDK format to OpenAI format)
  // Our internal format is already close, but let's ensure image format is correct
  // OpenAI expects content: [{type: "text", text: "..."}, {type: "image_url", image_url: {url: "..."}}]

  const payload = {
    model: model,
    messages: messages,
    max_tokens: maxTokens,
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

  const response = await postJsonWithTimeout(
    `${baseUrl}/chat/completions`,
    payloadString,
    headers,
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

    // Failed-but-billed requests can still incur cost. Best-effort capture usage
    // from the error body so the session tracker can include it.
    throw attachUsageToError(new Error(`API Error ${response.status}: ${errorBody}`), parseOpenAIUsage(errorBody, isOpenRouter));
  }

  const data = await response.json();

  const choice = data.choices?.[0];
  return {
    text: choice?.message?.content || '',
    finishReason: choice?.finish_reason,
    usage: parseOpenAIUsage(data, isOpenRouter),
  };
}
