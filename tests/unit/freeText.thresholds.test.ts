import { generateFreeTextDrafts } from '@/background/freeText';
import type { CustomResponse } from '@/shared/types';
import { createDefaultProfile, normalizeQuestion } from '@/shared/types';
import { cosineSimilarity, embedTextBatch } from '@/background/ai/embeddings';
import {
  getAllResponses,
  getProfile,
  getResponseByNormalizedQuestion,
} from '@/storage/index';
import {
  providerTextCompletion,
  withProviderFallback,
} from '@/background/ai/providers';

vi.mock('@/storage/index', () => ({
  getAllResponses: vi.fn(),
  getProfile: vi.fn(),
  getResponseByNormalizedQuestion: vi.fn(),
  saveResponse: vi.fn(),
}));

vi.mock('@/background/ai/embeddings', () => ({
  embedText: vi.fn(async () => [1, 0, 0]),
  embedTextBatch: vi.fn(async () => [[1, 0, 0]]),
  cosineSimilarity: vi.fn(() => 0),
}));

vi.mock('@/background/ai/prompts', () => ({
  buildFreeTextPrompt: vi.fn(() => 'prompt'),
}));

vi.mock('@/background/ai/providers', () => ({
  withProviderFallback: vi.fn(async (_opts, executor) => executor('anthropic')),
  providerTextCompletion: vi.fn(async () => 'generated answer'),
}));

const mockedGetProfile = vi.mocked(getProfile);
const mockedGetAllResponses = vi.mocked(getAllResponses);
const mockedGetResponseByNormalizedQuestion = vi.mocked(getResponseByNormalizedQuestion);
const mockedCosineSimilarity = vi.mocked(cosineSimilarity);
const mockedEmbedTextBatch = vi.mocked(embedTextBatch);
const mockedProviderTextCompletion = vi.mocked(providerTextCompletion);
const mockedWithProviderFallback = vi.mocked(withProviderFallback);

function makeResponse(overrides: Partial<CustomResponse>): CustomResponse {
  return {
    id: 1,
    question: 'Why this role?',
    normalizedQuestion: normalizeQuestion('Why this role?'),
    answer: 'Cached answer',
    embedding: [1, 0, 0],
    source: 'manual',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('free-text threshold routing', () => {
  beforeEach(() => {
    mockedGetProfile.mockResolvedValue(createDefaultProfile());
    mockedGetAllResponses.mockResolvedValue([]);
    mockedGetResponseByNormalizedQuestion.mockResolvedValue(undefined);
    mockedCosineSimilarity.mockReturnValue(0);
    mockedEmbedTextBatch.mockResolvedValue([[1, 0, 0]]);
    mockedProviderTextCompletion.mockResolvedValue('generated answer');
    mockedWithProviderFallback.mockImplementation(async (_opts, executor) =>
      executor('anthropic')
    );
  });

  it('uses exact cache match before semantic lookup', async () => {
    mockedGetResponseByNormalizedQuestion.mockResolvedValue(
      makeResponse({ answer: 'Exact cached answer' })
    );

    const drafts = await generateFreeTextDrafts(
      [{ fieldId: 'f1', question: 'Why this role?' }],
      {
        anthropicApiKey: 'a',
        openaiApiKey: 'o',
        primaryProvider: 'anthropic',
      }
    );

    expect(drafts[0]).toMatchObject({
      fieldId: 'f1',
      source: 'cache-exact',
      answer: 'Exact cached answer',
      similarity: 1,
    });
    expect(mockedProviderTextCompletion).not.toHaveBeenCalled();
    // embedTextBatch should not be called when all questions hit exact cache
    expect(mockedEmbedTextBatch).not.toHaveBeenCalled();
  });

  it('reuses semantic match when similarity >= 0.92', async () => {
    mockedGetAllResponses.mockResolvedValue([makeResponse({})]);
    mockedCosineSimilarity.mockReturnValue(0.95);

    const drafts = await generateFreeTextDrafts(
      [{ fieldId: 'f2', question: 'Why are you interested?' }],
      {
        anthropicApiKey: 'a',
        openaiApiKey: 'o',
        primaryProvider: 'anthropic',
      }
    );

    expect(drafts[0]).toMatchObject({
      source: 'cache-semantic-reuse',
      answer: 'Cached answer',
      similarity: 0.95,
    });
    expect(mockedProviderTextCompletion).not.toHaveBeenCalled();
  });

  it('adapts nearest answer when 0.78 <= similarity < 0.92', async () => {
    mockedGetAllResponses.mockResolvedValue([makeResponse({ answer: 'Nearest answer' })]);
    mockedCosineSimilarity.mockReturnValue(0.85);
    mockedProviderTextCompletion.mockResolvedValue('Adapted answer');

    const drafts = await generateFreeTextDrafts(
      [{ fieldId: 'f3', question: 'Tell us why you fit this role' }],
      {
        anthropicApiKey: 'a',
        openaiApiKey: 'o',
        primaryProvider: 'anthropic',
      }
    );

    expect(drafts[0]).toMatchObject({
      source: 'llm-adapted',
      answer: 'Adapted answer',
      similarity: 0.85,
    });
    expect(mockedProviderTextCompletion).toHaveBeenCalledTimes(1);
  });

  it('generates fresh answer when similarity < 0.78', async () => {
    mockedGetAllResponses.mockResolvedValue([makeResponse({ answer: 'Weakly related' })]);
    mockedCosineSimilarity.mockReturnValue(0.3);
    mockedProviderTextCompletion.mockResolvedValue('Fresh answer');

    const drafts = await generateFreeTextDrafts(
      [{ fieldId: 'f4', question: 'Describe your leadership style' }],
      {
        anthropicApiKey: 'a',
        openaiApiKey: 'o',
        primaryProvider: 'anthropic',
      }
    );

    expect(drafts[0]).toMatchObject({
      source: 'llm-generated',
      answer: 'Fresh answer',
      similarity: 0.3,
    });
  });
});
