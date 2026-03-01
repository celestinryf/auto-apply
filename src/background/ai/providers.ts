import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, Settings } from '@/shared/types';
import { createDefaultSettings } from '@/shared/types';

const RETRYABLE_HTTP_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

interface ProviderExecutionOptions {
  settings: Settings;
  taskName: string;
}

type ProviderExecutor<T> = (provider: AIProvider) => Promise<T>;

export async function withProviderFallback<T>(
  options: ProviderExecutionOptions,
  executor: ProviderExecutor<T>
): Promise<T> {
  const providers = orderedProviders(options.settings.primaryProvider);
  let lastError: unknown;

  for (const provider of providers) {
    try {
      validateProviderConfig(provider, options.settings);
      return await executor(provider);
    } catch (error) {
      lastError = error;
      if (!shouldFallback(error)) {
        throw error;
      }
      console.warn(
        `[Auto Apply] ${options.taskName} failed on ${provider}, trying fallback:`,
        error
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`All providers failed for task: ${options.taskName}`);
}

export async function providerTextCompletion(
  provider: AIProvider,
  settings: Settings,
  prompt: string
): Promise<string> {
  if (provider === 'anthropic') {
    const client = new Anthropic({
      apiKey: settings.anthropicApiKey,
      dangerouslyAllowBrowser: true,
    });

    const response = await client.messages.create({
      model: settings.anthropicModel ?? createDefaultSettings().anthropicModel!,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('Anthropic returned a non-text response.');
    }
    return content.text.trim();
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.openaiModel ?? createDefaultSettings().openaiModel,
      input: prompt,
    }),
  });

  if (!response.ok) {
    const body = await safeErrorBody(response);
    throw createHttpError(response.status, body);
  }

  const data = (await response.json()) as {
    output_text?: string;
  };

  const output = data.output_text?.trim();
  if (!output) {
    throw new Error('OpenAI returned an empty response.');
  }
  return output;
}

function orderedProviders(primary: AIProvider): AIProvider[] {
  return primary === 'anthropic' ? ['anthropic', 'openai'] : ['openai', 'anthropic'];
}

function validateProviderConfig(provider: AIProvider, settings: Settings): void {
  if (provider === 'anthropic' && !settings.anthropicApiKey) {
    throw new Error('Anthropic API key is missing. Configure it in Settings.');
  }
  if (provider === 'openai' && !settings.openaiApiKey) {
    throw new Error('OpenAI API key is missing. Configure it in Settings.');
  }
}

function shouldFallback(error: unknown): boolean {
  if (error instanceof HttpError) {
    if (error.status === 401 || error.status === 403) {
      return false;
    }
    return RETRYABLE_HTTP_STATUS.has(error.status);
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('missing') &&
      message.includes('api key')
    ) {
      return false;
    }
    if (
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('invalid api key')
    ) {
      return false;
    }
  }

  return true;
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function createHttpError(status: number, body: string): HttpError {
  return new HttpError(status, `HTTP ${status}: ${body || 'Unknown API error'}`);
}

async function safeErrorBody(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return JSON.stringify(data);
  } catch {
    try {
      return await response.text();
    } catch {
      return '';
    }
  }
}
