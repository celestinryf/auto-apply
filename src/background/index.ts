import browser from 'webextension-polyfill';
import {
  getProfile,
  saveProfile,
  getResponse,
  saveResponse,
  getApiKey,
  saveApiKey,
} from '@/storage/index';
import { parseResumeText } from '@/background/resumeParser';
import type { MessageType, UserProfile } from '@/shared/types';

function isMessageType(message: unknown): message is MessageType {
  if (!message || typeof message !== 'object') return false;
  const typed = message as Record<string, unknown>;
  if (typeof typed.type !== 'string') return false;

  switch (typed.type) {
    case 'GET_PROFILE':
    case 'FILL_FIELDS':
    case 'GET_API_KEY':
      return true;
    case 'SAVE_PROFILE':
      return typeof typed.profile === 'object' && typed.profile !== null;
    case 'GET_RESPONSE':
      return typeof typed.question === 'string';
    case 'SAVE_RESPONSE':
      return typeof typed.question === 'string' && typeof typed.answer === 'string';
    case 'SAVE_API_KEY':
      return typeof typed.key === 'string';
    case 'PARSE_RESUME':
      return typeof typed.text === 'string';
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
      case 'GET_PROFILE':
        return getProfile();

      case 'SAVE_PROFILE':
        return saveProfile(message.profile);

      case 'GET_RESPONSE':
        return getResponse(message.question);

      case 'SAVE_RESPONSE':
        return saveResponse(message.question, message.answer);

      case 'GET_API_KEY':
        return getApiKey();

      case 'SAVE_API_KEY':
        return saveApiKey(message.key);

      case 'PARSE_RESUME':
        return parseResumeWithApiKey(message.text);

      default:
        return undefined;
    }
  }
);

async function parseResumeWithApiKey(text: string): Promise<UserProfile> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('API key not configured. Please add your API key in Settings.');
  }
  return parseResumeText(text, apiKey);
}

console.log('[Auto Apply] Background service worker initialized');
