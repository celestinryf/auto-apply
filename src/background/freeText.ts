import type {
  FreeTextDraft,
  FreeTextPromptInput,
  Settings,
  UserProfile,
} from '@/shared/types';
import { normalizeQuestion } from '@/shared/types';
import {
  getAllResponses,
  getProfile,
  getResponseByNormalizedQuestion,
  saveResponse,
} from '@/storage/index';
import { buildFreeTextPrompt } from '@/background/ai/prompts';
import { embedText, embedTextBatch, cosineSimilarity } from '@/background/ai/embeddings';
import { withProviderFallback, providerTextCompletion } from '@/background/ai/providers';

const REUSE_THRESHOLD = 0.92;
const ADAPT_THRESHOLD = 0.78;

export async function generateFreeTextDrafts(
  prompts: FreeTextPromptInput[],
  settings: Settings
): Promise<FreeTextDraft[]> {
  const profile = await getProfile();
  const responses = await getAllResponses();
  const drafts: FreeTextDraft[] = [];

  // Phase 1: Check exact cache matches and collect questions needing embeddings
  const needsEmbedding: { index: number; prompt: FreeTextPromptInput; normalized: string }[] = [];

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    const normalized = normalizeQuestion(prompt.question);
    const exact = await getResponseByNormalizedQuestion(normalized);
    if (exact) {
      drafts[i] = {
        fieldId: prompt.fieldId,
        question: prompt.question,
        answer: exact.answer,
        source: 'cache-exact',
        similarity: 1,
      };
    } else {
      needsEmbedding.push({ index: i, prompt, normalized });
    }
  }

  if (needsEmbedding.length === 0) return drafts.filter(Boolean);

  // Phase 2: Batch embed all questions that need semantic matching
  const textsToEmbed = needsEmbedding.map((item) => item.normalized);
  const embeddings = await embedTextBatch(textsToEmbed, settings.openaiApiKey);

  // Phase 3: Semantic match + LLM generation (sequential for LLM calls)
  for (let j = 0; j < needsEmbedding.length; j++) {
    const { index, prompt } = needsEmbedding[j];
    const incomingEmbedding = embeddings[j];
    const best = getBestSemanticMatch(incomingEmbedding, responses);

    if (best && best.similarity >= REUSE_THRESHOLD) {
      drafts[index] = {
        fieldId: prompt.fieldId,
        question: prompt.question,
        answer: best.answer,
        source: 'cache-semantic-reuse',
        similarity: best.similarity,
      };
      continue;
    }

    const adapted = best && best.similarity >= ADAPT_THRESHOLD ? best.answer : undefined;
    const answer = await generateAnswer(profile, prompt, settings, adapted);
    drafts[index] = {
      fieldId: prompt.fieldId,
      question: prompt.question,
      answer,
      source: adapted ? 'llm-adapted' : 'llm-generated',
      similarity: best?.similarity,
    };
  }

  return drafts.filter(Boolean);
}

export async function persistResponsesBatch(
  responses: {
    question: string;
    answer: string;
    source: 'manual' | 'llm-generated' | 'llm-edited';
  }[],
  settings: Settings
): Promise<void> {
  for (const response of responses) {
    const normalized = normalizeQuestion(response.question);
    const embedding = await embedText(normalized, settings.openaiApiKey);
    await saveResponse(response.question, response.answer, {
      normalizedQuestion: normalized,
      embedding,
      source: response.source,
    });
  }
}

async function generateAnswer(
  profile: UserProfile,
  prompt: FreeTextPromptInput,
  settings: Settings,
  similarAnswer?: string
): Promise<string> {
  const finalPrompt = buildFreeTextPrompt(profile, prompt, similarAnswer);
  return withProviderFallback(
    { settings, taskName: 'free-text generation' },
    (provider) => providerTextCompletion(provider, settings, finalPrompt)
  );
}

function getBestSemanticMatch(
  embedding: number[],
  responses: {
    answer: string;
    embedding: number[];
  }[]
): { answer: string; similarity: number } | null {
  let best: { answer: string; similarity: number } | null = null;

  for (const response of responses) {
    if (!response.embedding || response.embedding.length !== embedding.length) continue;
    const similarity = cosineSimilarity(embedding, response.embedding);
    if (!best || similarity > best.similarity) {
      best = { answer: response.answer, similarity };
    }
  }

  return best;
}
