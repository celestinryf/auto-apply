import Dexie, { type EntityTable } from 'dexie';
import browser from 'webextension-polyfill';
import type { UserProfile, CustomResponse, Settings, StoredFile, FilePurpose } from '@/shared/types';
import {
  createDefaultProfile,
  createDefaultSettings,
  normalizeQuestion,
} from '@/shared/types';

const db = new Dexie('AutoApplyDB') as Dexie & {
  profiles: EntityTable<UserProfile, 'id'>;
  responses: EntityTable<CustomResponse, 'id'>;
  files: EntityTable<StoredFile, 'id'>;
};

db.version(1).stores({
  profiles: '++id, updatedAt',
  responses: '++id, question, updatedAt',
});

db.version(2).stores({
  profiles: '++id, updatedAt',
  responses: '++id, question, normalizedQuestion, updatedAt',
});

db.version(3).stores({
  profiles: '++id, updatedAt',
  responses: '++id, question, normalizedQuestion, updatedAt',
  files: '++id, name, purpose, createdAt',
});

// ---- Profile ----

export async function getProfile(): Promise<UserProfile> {
  const profile = await db.profiles.toCollection().first();
  return profile ?? createDefaultProfile();
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const nextProfile: UserProfile = {
    ...profile,
    updatedAt: Date.now(),
  };
  const existing = await db.profiles.toCollection().first();
  if (existing?.id) {
    await db.profiles.put({ ...nextProfile, id: existing.id });
  } else {
    await db.profiles.add(nextProfile);
  }
}

// ---- Custom Responses ----

export async function getResponse(question: string): Promise<CustomResponse | undefined> {
  const response = await db.responses.where('question').equalsIgnoreCase(question).first();
  return response ? hydrateResponse(response) : undefined;
}

export async function getResponseByNormalizedQuestion(
  normalized: string
): Promise<CustomResponse | undefined> {
  const response = await db.responses.where('normalizedQuestion').equals(normalized).first();
  return response ? hydrateResponse(response) : undefined;
}

export async function getAllResponses(): Promise<CustomResponse[]> {
  const all = await db.responses.toArray();
  return all.map(hydrateResponse);
}

export async function saveResponse(
  question: string,
  answer: string,
  metadata?: {
    normalizedQuestion?: string;
    embedding?: number[];
    source?: 'manual' | 'llm-generated' | 'llm-edited';
  }
): Promise<void> {
  const existing = await getResponse(question);
  const now = Date.now();
  const normalized = metadata?.normalizedQuestion ?? normalizeQuestion(question);
  const embedding =
    metadata?.embedding ??
    (Array.isArray(existing?.embedding) ? existing.embedding : []);
  const source = metadata?.source ?? existing?.source ?? 'manual';

  if (existing?.id) {
    await db.responses.update(existing.id, {
      answer,
      normalizedQuestion: normalized,
      embedding,
      source,
      updatedAt: now,
    });
  } else {
    await db.responses.add({
      question,
      normalizedQuestion: normalized,
      answer,
      embedding,
      source,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function deleteResponse(id: number): Promise<void> {
  await db.responses.delete(id);
}

// ---- Stored Files ----

export async function saveFile(
  name: string,
  data: ArrayBuffer,
  mimeType: string,
  purpose: FilePurpose
): Promise<number> {
  return db.files.add({
    name,
    mimeType,
    data,
    purpose,
    createdAt: Date.now(),
  });
}

export async function getFile(id: number): Promise<StoredFile | undefined> {
  return db.files.get(id);
}

export async function getFilesByPurpose(purpose: FilePurpose): Promise<StoredFile[]> {
  return db.files.where('purpose').equals(purpose).reverse().sortBy('createdAt');
}

export async function getAllFiles(): Promise<StoredFile[]> {
  return db.files.toArray();
}

export async function deleteFile(id: number): Promise<void> {
  await db.files.delete(id);
}

// ---- API Key (stored in extension local storage for simplicity) ----

export async function getApiKey(): Promise<string> {
  const settings = await getSettings();
  return settings.anthropicApiKey;
}

export async function saveApiKey(key: string): Promise<void> {
  const settings = await getSettings();
  await saveSettings({ ...settings, anthropicApiKey: key });
}

export async function getSettings(): Promise<Settings> {
  const result = await browser.storage.local.get('settings');
  const defaults = createDefaultSettings();
  if (!result.settings || typeof result.settings !== 'object') {
    return defaults;
  }

  const settings = result.settings as Partial<Settings>;
  return {
    anthropicApiKey:
      typeof settings.anthropicApiKey === 'string'
        ? settings.anthropicApiKey
        : defaults.anthropicApiKey,
    openaiApiKey:
      typeof settings.openaiApiKey === 'string'
        ? settings.openaiApiKey
        : defaults.openaiApiKey,
    primaryProvider:
      settings.primaryProvider === 'openai' ? 'openai' : defaults.primaryProvider,
    anthropicModel:
      typeof settings.anthropicModel === 'string'
        ? settings.anthropicModel
        : defaults.anthropicModel,
    openaiModel:
      typeof settings.openaiModel === 'string'
        ? settings.openaiModel
        : defaults.openaiModel,
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ settings });
}

export { db };

function hydrateResponse(response: CustomResponse): CustomResponse {
  return {
    ...response,
    normalizedQuestion: response.normalizedQuestion ?? normalizeQuestion(response.question),
    embedding: Array.isArray(response.embedding) ? response.embedding : [],
    source: response.source ?? 'manual',
  };
}
