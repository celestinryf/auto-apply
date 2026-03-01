import browser from 'webextension-polyfill';
import {
  getProfile,
  saveProfile,
  getResponse,
  saveResponse,
  getApiKey,
  saveApiKey,
  getSettings,
  saveSettings,
  saveFile,
  getFilesByPurpose,
  getAllFiles,
  deleteFile,
} from '@/storage/index';
import { parseResumeText } from '@/background/resumeParser';
import type { FreeTextPromptInput, FilePurpose, MessageType } from '@/shared/types';
import { generateFreeTextDrafts, persistResponsesBatch } from '@/background/freeText';
import { runAutofillOnActiveTab } from '@/background/tabRunner';

function isMessageType(message: unknown): message is MessageType {
  if (!message || typeof message !== 'object') return false;
  const typed = message as Record<string, unknown>;
  if (typeof typed.type !== 'string') return false;

  switch (typed.type) {
    case 'RUN_AUTOFILL_ACTIVE_TAB':
    case 'GET_PROFILE':
    case 'FILL_FIELDS':
    case 'GET_API_KEY':
    case 'GET_SETTINGS':
    case 'GET_FILES':
      return true;
    case 'SAVE_PROFILE':
      return typeof typed.profile === 'object' && typed.profile !== null;
    case 'GET_RESPONSE':
      return typeof typed.question === 'string';
    case 'SAVE_RESPONSE':
      return typeof typed.question === 'string' && typeof typed.answer === 'string';
    case 'SAVE_RESPONSES_BATCH':
      return Array.isArray(typed.responses);
    case 'SAVE_API_KEY':
      return typeof typed.key === 'string';
    case 'SAVE_SETTINGS':
      return typeof typed.settings === 'object' && typed.settings !== null;
    case 'PARSE_RESUME':
      return typeof typed.text === 'string';
    case 'GENERATE_FREE_TEXT_DRAFTS':
      return Array.isArray(typed.prompts);
    case 'GET_FILE_FOR_PURPOSE':
      return typeof typed.purpose === 'string';
    case 'SAVE_FILE':
      return (
        typeof typed.name === 'string' &&
        typeof typed.data === 'string' &&
        typeof typed.mimeType === 'string' &&
        typeof typed.purpose === 'string'
      );
    case 'DELETE_FILE':
      return typeof typed.id === 'number';
    default:
      return false;
  }
}

browser.runtime.onMessage.addListener(
  (message: unknown): Promise<unknown> | undefined => {
    if (!isMessageType(message)) {
      return undefined;
    }

    switch (message.type) {
      case 'RUN_AUTOFILL_ACTIVE_TAB':
        return runAutofillOnActiveTab();

      case 'GET_PROFILE':
        return getProfile();

      case 'SAVE_PROFILE':
        return saveProfile(message.profile);

      case 'GET_RESPONSE':
        return getResponse(message.question);

      case 'SAVE_RESPONSE':
        return saveResponse(message.question, message.answer, {
          source: message.source,
        });

      case 'SAVE_RESPONSES_BATCH':
        return persistResponsesBatchWithSettings(message.responses);

      case 'GET_API_KEY':
        return getApiKey();

      case 'SAVE_API_KEY':
        return saveApiKey(message.key);

      case 'GET_SETTINGS':
        return getSettings();

      case 'SAVE_SETTINGS':
        return saveSettings(message.settings);

      case 'PARSE_RESUME':
        return parseResumeFromSettings(message.text);

      case 'GENERATE_FREE_TEXT_DRAFTS':
        return generateDrafts(message.prompts);

      case 'GET_FILE_FOR_PURPOSE':
        return getFileForPurpose(message.purpose);

      case 'SAVE_FILE':
        return handleSaveFile(message.name, message.data, message.mimeType, message.purpose);

      case 'GET_FILES':
        return getFilesWithoutData();

      case 'DELETE_FILE':
        return deleteFile(message.id);

      default:
        return undefined;
    }
  }
);

async function parseResumeFromSettings(text: string) {
  const settings = await getSettings();
  return parseResumeText(text, settings);
}

async function persistResponsesBatchWithSettings(
  responses: {
    question: string;
    answer: string;
    source: 'manual' | 'llm-generated' | 'llm-edited';
  }[]
) {
  const settings = await getSettings();
  return persistResponsesBatch(responses, settings);
}

async function generateDrafts(prompts: FreeTextPromptInput[]) {
  const settings = await getSettings();
  return generateFreeTextDrafts(prompts, settings);
}

async function getFilesWithoutData() {
  const files = await getAllFiles();
  return files.map(({ data: _data, ...rest }) => rest);
}

async function getFileForPurpose(purpose: FilePurpose) {
  const files = await getFilesByPurpose(purpose);
  if (files.length === 0) return null;

  const file = files[0]; // most recent
  const bytes = new Uint8Array(file.data);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return {
    name: file.name,
    data: base64,
    mimeType: file.mimeType,
  };
}

async function handleSaveFile(
  name: string,
  data: string,
  mimeType: string,
  purpose: FilePurpose
) {
  const binaryString = atob(data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return saveFile(name, bytes.buffer, mimeType, purpose);
}

console.log('[Auto Apply] Background service worker initialized');
