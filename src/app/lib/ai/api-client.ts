/**
 * AI API Client Module
 * Thin dispatcher: routes to reusable provider modules via direct fetch.
 * Provider logic lives in ./providers/*, shared HTTP helpers in ./http.
 * This file re-exports shared types/helpers for backward compatibility.
 */
import { normalizeLocalBaseUrl } from "../models/modelFetcher";
import { stripThinkBlocks } from "./response-parser";
import { callGoogleGemini, isGoogleProvider } from "./providers/google";
import { callOpenAICompatible, parseOpenAIUsage } from "./providers/openai";
import { callOpenRouter, isOpenRouterProvider } from "./providers/openrouter";
import {
  postJsonWithTimeout,
  attachUsageToError,
  ensureBase64,
  CANCELLED_MESSAGE,
  LOCAL_REQUEST_TIMEOUT_MS,
  REMOTE_REQUEST_TIMEOUT_MS,
  type MessageContent,
  type AIUsage,
  type AIResponse,
  type GenerateTextOptions,
} from "./http";

// Backward-compatible re-exports so existing imports from './ai/api-client' keep working
export {
  ensureBase64,
  CANCELLED_MESSAGE,
  type MessageContent,
  type AIUsage,
  type AIResponse,
  type GenerateTextOptions,
};

/**
 * Calls the AI API with the provided options using direct fetch.
 * Delegates to the reusable provider modules.
 */
export const callAIApi = async (options: GenerateTextOptions): Promise<AIResponse> => {
  const { provider, apiKey, model, messages, maxTokens, signal } = options;
  console.log('🚀 Sending to AI (Direct Fetch)...', { provider, model });

  try {
    if (isGoogleProvider(provider)) {
      return await callGoogleGemini(apiKey, model, messages, maxTokens, signal);
    } else if (isOpenRouterProvider(provider)) {
      return await callOpenRouter(apiKey, model, messages, maxTokens, signal);
    } else {
      // OpenAI and any other OpenAI-compatible provider
      const baseUrl = 'https://api.openai.com/v1';

      return await callOpenAICompatible(baseUrl, apiKey, model, messages, false, maxTokens, signal);
    }
  } catch (error: any) {
    console.error('❌ AI API call failed:', error);
    // Preserve cancellation/timeout messages so callers can recognize them
    if (error instanceof Error && (error.message === CANCELLED_MESSAGE || error.message.startsWith('AI request timed out'))) {
      throw error;
    }
    throw new Error(`AI API call failed: ${error.message || error}`);
  }
};

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
 * Extracts the assistant's text from a local OpenAI-compatible choice.
 * Handles shape variants seen across LM Studio / Ollama / llama.cpp builds:
 * - string content (standard)
 * - array content parts ([{type:'text',text}, {type:'image_url',...}])
 * - legacy `choice.text` (completions-style bodies)
 * - answer carried only in reasoning fields (returned separately so the
 *   caller can report a clear "thinking mode" error)
 */
export function extractLocalChoiceText(choice: any): { text: string; reasoningText: string; contentType: string } {
  const message = choice?.message ?? {};
  const rawContent = message.content ?? choice?.text ?? '';
  let text = '';
  let contentType: string = Array.isArray(rawContent) ? 'array' : typeof rawContent;

  if (typeof rawContent === 'string') {
    text = rawContent;
  } else if (Array.isArray(rawContent)) {
    text = rawContent
      .map((part: any) => {
        if (typeof part === 'string') return part;
        if (typeof part?.text === 'string') return part.text;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  const reasoningText = [
    message.reasoning_content,
    message.reasoning,
    choice?.reasoning_content,
  ]
    .filter((v) => typeof v === 'string' && v.trim())
    .join('\n');

  return { text: stripThinkBlocks(text), reasoningText, contentType };
}

interface LocalOpenAICompatibleOptions {
  model: string;
  messages: any[];
  /** Base URL of the OpenAI-compatible local server (e.g. http://localhost:1234/v1) */
  baseUrl?: string;
  /** Max output tokens for this call (defaults to 2048) */
  maxTokens?: number;
  /** Abort signal so in-flight requests can be cancelled */
  signal?: AbortSignal;
}

export async function callLocalOpenAICompatible(options: LocalOpenAICompatibleOptions): Promise<AIResponse> {
  const { model, messages, baseUrl, maxTokens = 2048, signal } = options;
  const url = normalizeLocalBaseUrl(baseUrl);

  if (!url) {
    throw new Error('No local AI server URL configured. Please set it in Settings.');
  }

  console.log('🏠 Calling local OpenAI-compatible API...', { model, url });

  let data: any;

  try {
    const payload = {
      model: model,
      messages: messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: false,
    };

    const payloadString = JSON.stringify(payload);
    console.log(`📦 Local AI Payload size: ${(payloadString.length / 1024).toFixed(2)} KB`);

    const response = await postJsonWithTimeout(`${url}/chat/completions`, payloadString, {
      'Content-Type': 'application/json',
    }, { timeoutMs: LOCAL_REQUEST_TIMEOUT_MS, signal });

    if (!response.ok) {
      const errorBody = await response.text();
      throw attachUsageToError(
        new Error(`Local AI API Error ${response.status}: ${errorBody}`),
        parseOpenAIUsage(errorBody)
      );
    }

    data = await response.json();
  } catch (error: any) {
    if (error instanceof Error && (error.message === CANCELLED_MESSAGE || error.message.startsWith('AI request timed out'))) {
      console.error('❌ Local AI request aborted:', error.message);
    } else {
      console.error('❌ Local AI API call failed:', error);
    }
    throw error;
  }

  const choice = data.choices?.[0];
  const { text, reasoningText, contentType } = extractLocalChoiceText(choice);

  console.log('🏠 Local AI response shape:', {
    model,
    contentType,
    finishReason: choice?.finish_reason,
    textChars: text.length,
    hasReasoning: Boolean(reasoningText),
    preview: text.slice(0, 300),
  });

  // Some servers return the answer only in a separate reasoning field
  const reasoningOnly = !text.trim() && Boolean(reasoningText);

  if (reasoningOnly) {
    throw new Error(
      'The local model produced only reasoning tokens and no final answer. ' +
      'Disable "thinking" mode for this model in your local server, or select a non-reasoning vision model.'
    );
  }

  return {
    text,
    finishReason: choice?.finish_reason,
    usage: parseOpenAIUsage(data),
  };
}

/**
 * Creates a message content array for local OpenAI-compatible APIs
 * Uses base64 data URLs - supported by most local vision servers
 */
export function createLocalMessageContent(
  prompt: string,
  imageUrl: string
): MessageContent[] {
  return [
    {
      type: 'text',
      text: prompt,
    },
    {
      type: 'image_url',
      image_url: {
        url: imageUrl,
      },
    },
  ];
}

// Re-export timeout constants for any direct callers (kept for compatibility)
export { LOCAL_REQUEST_TIMEOUT_MS, REMOTE_REQUEST_TIMEOUT_MS };
