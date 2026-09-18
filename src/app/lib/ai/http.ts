/**
 * AI HTTP Shared Module
 * Generic fetch/timeout/types helpers shared by all providers.
 * Contains no provider-specific logic to avoid circular imports.
 */
import { fetch } from "@tauri-apps/plugin-http";

export type MessageContent = {
  type: 'text' | 'image_url'; // OpenAI/OpenRouter standard
  text?: string;
  image_url?: {
    url: string;
  };
};

export type AIUsage = {
  promptTokens: number;
  completionTokens: number;
  /** Exact billed cost in USD when the provider reports it (e.g. OpenRouter total_cost) */
  totalCost?: number;
};

export type AIResponse = {
  text: string;
  finishReason?: string;
  usage?: AIUsage;
};

export type GenerateTextOptions = {
  provider: string;
  apiKey: string;
  model: string;
  messages: any[];
  /** Max output tokens for this call (defaults to 2048) */
  maxTokens?: number;
  /** Abort signal so in-flight requests can be cancelled */
  signal?: AbortSignal;
};

/** Local servers can be slow (prompt processing, cold loads) — generous ceiling */
export const LOCAL_REQUEST_TIMEOUT_MS = 180_000;
export const REMOTE_REQUEST_TIMEOUT_MS = 120_000;

export const CANCELLED_MESSAGE = 'Request cancelled';

/**
 * POSTs JSON with a hard timeout and optional external abort signal.
 * Distinguishes timeout from cancellation with distinct error messages so
 * callers never hang forever waiting on a stuck server.
 */
export async function postJsonWithTimeout(
  url: string,
  body: string,
  headers: Record<string, string>,
  options: { timeoutMs: number; signal?: AbortSignal }
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs);

  const forwardAbort = () => controller.abort();
  const external = options.signal;
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener('abort', forwardAbort);
  }

  try {
    return await fetch(url, { method: 'POST', headers, body, signal: controller.signal });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(
        timedOut
          ? `AI request timed out after ${Math.round(options.timeoutMs / 1000)}s. The server may be busy or the model may not support this request.`
          : CANCELLED_MESSAGE
      );
    }
    // Tauri's HTTP plugin may surface aborts under a different error name
    if (external?.aborted) {
      throw new Error(CANCELLED_MESSAGE);
    }
    throw error;
  } finally {
    clearTimeout(timer);
    if (external) external.removeEventListener('abort', forwardAbort);
  }
}

/**
 * Attaches usage info to an error so failed-but-billed requests can still be
 * counted by the session cost tracker.
 */
export function attachUsageToError(error: Error, usage?: AIUsage): Error {
  if (usage) {
    (error as Error & { usage?: AIUsage }).usage = usage;
  }
  return error;
}

/**
 * Helper to validate/fix base64 strings if needed
 */
export const ensureBase64 = (url: string): string => {
  if (url.startsWith('data:')) return url;
  throw new Error('Expected data URL');
};
