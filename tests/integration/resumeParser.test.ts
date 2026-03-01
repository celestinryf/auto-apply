import { parseResumeText } from '@/background/resumeParser';
import type { AIProvider, Settings } from '@/shared/types';
import { providerTextCompletion } from '@/background/ai/providers';

const providerMocks = vi.hoisted(() => ({
  withProviderFallback: vi.fn(
    async (
      options: { settings: Settings },
      executor: (provider: AIProvider) => Promise<Record<string, unknown>>
    ) => {
      const providers =
        options.settings.primaryProvider === 'anthropic'
          ? (['anthropic', 'openai'] as const)
          : (['openai', 'anthropic'] as const);
      let lastError: unknown;

      for (const provider of providers) {
        try {
          return await executor(provider);
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    }
  ),
  providerTextCompletion: vi.fn(),
}));

vi.mock('@/background/ai/providers', () => providerMocks);

const mockedProviderTextCompletion = vi.mocked(providerTextCompletion);

function baseSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    anthropicApiKey: 'anthropic',
    openaiApiKey: 'openai',
    primaryProvider: 'anthropic',
    anthropicModel: 'claude-sonnet-4-20250514',
    openaiModel: 'gpt-4.1-mini',
    ...overrides,
  };
}

const VALID_JSON = JSON.stringify({
  personal: {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: '555',
    location: { city: 'London', state: '', country: 'UK' },
  },
  work: [],
  education: [],
  skills: ['TypeScript'],
  certifications: [],
  languages: [{ language: 'English', proficiency: 'Native' }],
});

describe('resume parser integration', () => {
  beforeEach(() => {
    mockedProviderTextCompletion.mockReset();
  });

  it('parses successful provider output', async () => {
    mockedProviderTextCompletion.mockResolvedValue(VALID_JSON);

    const profile = await parseResumeText('resume', baseSettings());

    expect(profile.personal.firstName).toBe('Ada');
    expect(profile.personal.lastName).toBe('Lovelace');
    expect(profile.skills).toEqual(['TypeScript']);
  });

  it('falls back after retryable/provider failure', async () => {
    mockedProviderTextCompletion
      .mockRejectedValueOnce(new Error('network timeout'))
      .mockResolvedValueOnce(VALID_JSON);

    const profile = await parseResumeText('resume', baseSettings());

    expect(mockedProviderTextCompletion).toHaveBeenCalledTimes(2);
    expect(profile.personal.email).toBe('ada@example.com');
  });

  it('falls back when primary provider returns malformed JSON', async () => {
    mockedProviderTextCompletion
      .mockResolvedValueOnce('not-json at all')
      .mockResolvedValueOnce(VALID_JSON);

    const profile = await parseResumeText('resume', baseSettings());

    expect(mockedProviderTextCompletion).toHaveBeenCalledTimes(2);
    expect(profile.personal.firstName).toBe('Ada');
  });
});
