import { providerTextCompletion, withProviderFallback } from '@/background/ai/providers';
import type { Settings } from '@/shared/types';

const anthropicCreateMock = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: anthropicCreateMock,
      };
    },
  };
});

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    anthropicApiKey: 'anthropic-key',
    openaiApiKey: 'openai-key',
    primaryProvider: 'anthropic',
    anthropicModel: 'claude-sonnet-4-20250514',
    openaiModel: 'gpt-4.1-mini',
    ...overrides,
  };
}

describe('provider fallback decision matrix', () => {
  beforeEach(() => {
    anthropicCreateMock.mockReset();
    anthropicCreateMock.mockResolvedValue({
      content: [{ type: 'text', text: 'anthropic-success' }],
    });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to secondary provider on retryable HTTP errors (429/5xx)', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'rate_limited' } }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await withProviderFallback(
      {
        settings: settings({ primaryProvider: 'openai' }),
        taskName: 'free-text generation',
      },
      (provider) => providerTextCompletion(provider, settings({ primaryProvider: 'openai' }), 'prompt')
    );

    expect(result).toBe('anthropic-success');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(anthropicCreateMock).toHaveBeenCalledTimes(1);
  });

  it('falls back on network errors/timeouts', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network timeout'));

    const result = await withProviderFallback(
      {
        settings: settings({ primaryProvider: 'openai' }),
        taskName: 'resume parsing',
      },
      (provider) => providerTextCompletion(provider, settings({ primaryProvider: 'openai' }), 'prompt')
    );

    expect(result).toBe('anthropic-success');
    expect(anthropicCreateMock).toHaveBeenCalledTimes(1);
  });

  it('does not fallback on unauthorized/invalid key errors', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'invalid api key' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(
      withProviderFallback(
        {
          settings: settings({ primaryProvider: 'openai' }),
          taskName: 'free-text generation',
        },
        (provider) =>
          providerTextCompletion(provider, settings({ primaryProvider: 'openai' }), 'prompt')
      )
    ).rejects.toThrow(/401/i);

    expect(anthropicCreateMock).not.toHaveBeenCalled();
  });

  it('does not fallback when primary provider key is missing', async () => {
    const executor = vi.fn(async () => 'should-not-run');

    await expect(
      withProviderFallback(
        {
          settings: settings({ primaryProvider: 'openai', openaiApiKey: '' }),
          taskName: 'free-text generation',
        },
        executor
      )
    ).rejects.toThrow(/api key is missing/i);

    expect(executor).not.toHaveBeenCalled();
  });
});
