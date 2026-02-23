import Dexie, { type EntityTable } from 'dexie';
import browser from 'webextension-polyfill';
import type { UserProfile, CustomResponse } from '@/shared/types';
import { createDefaultProfile } from '@/shared/types';

const db = new Dexie('AutoApplyDB') as Dexie & {
  profiles: EntityTable<UserProfile, 'id'>;
  responses: EntityTable<CustomResponse, 'id'>;
};

db.version(1).stores({
  profiles: '++id, updatedAt',
  responses: '++id, question, updatedAt',
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
  return db.responses
    .where('question')
    .equalsIgnoreCase(question)
    .first();
}

export async function getAllResponses(): Promise<CustomResponse[]> {
  return db.responses.toArray();
}

export async function saveResponse(question: string, answer: string): Promise<void> {
  const existing = await getResponse(question);
  const now = Date.now();
  if (existing?.id) {
    await db.responses.update(existing.id, { answer, updatedAt: now });
  } else {
    await db.responses.add({ question, answer, createdAt: now, updatedAt: now });
  }
}

export async function deleteResponse(id: number): Promise<void> {
  await db.responses.delete(id);
}

// ---- API Key (stored in extension local storage for simplicity) ----

export async function getApiKey(): Promise<string> {
  const result = await browser.storage.local.get('apiKey');
  return typeof result.apiKey === 'string' ? result.apiKey : '';
}

export async function saveApiKey(key: string): Promise<void> {
  await browser.storage.local.set({ apiKey: key });
}

export { db };
