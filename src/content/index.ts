import browser from 'webextension-polyfill';
import { fillDeterministicFields } from './filler';
import { detectFreeTextFields, extractPageContext } from './freeText';
import { showFreeTextReview } from './reviewOverlay';
import { fillFileFields } from './fileFiller';
import { GenericFormAdapter } from './adapters/generic';
import type { FormAdapter, FillResult, RunAutofillResult, UserProfile } from '@/shared/types';

interface RunAutofillMessage {
  type: 'RUN_AUTOFILL';
}

interface ContentWindow extends Window {
  __autoApplyRunListenerInstalled?: boolean;
}

function isRunAutofillMessage(message: unknown): message is RunAutofillMessage {
  if (!message || typeof message !== 'object') return false;
  return (message as Record<string, unknown>).type === 'RUN_AUTOFILL';
}

function createEmptyResult(): FillResult {
  return {
    total: 0,
    filled: 0,
    skipped: 0,
    fields: [],
  };
}

async function runAutofill(): Promise<RunAutofillResult> {
  const adapter = new GenericFormAdapter();
  const fields = adapter.getFields();
  if (fields.length === 0) {
    return {
      result: createEmptyResult(),
      warnings: ['No form fields found on this page.'],
    };
  }

  const profile = (await browser.runtime.sendMessage({
    type: 'GET_PROFILE',
  })) as UserProfile;

  if (!profile.personal.firstName && !profile.personal.email) {
    throw new Error('No profile found. Please set up your profile in the extension popup first.');
  }

  const result = fillDeterministicFields(adapter, profile);

  // Fill file input fields (resume, cover letter)
  const fileFields = adapter.getFields().filter((f) => f.type === 'file');
  if (fileFields.length > 0) {
    const fileResult = await fillFileFields(fileFields);
    result.filled += fileResult.filled;
    result.skipped += fileResult.skipped;
    result.total += fileResult.filled + fileResult.skipped;
    result.fields.push(...fileResult.fields);
  }

  // Fill free-text fields with AI-generated answers and review
  const finalResult = await fillFreeTextWithReview(adapter, result);

  return {
    result: finalResult,
    warnings: [],
  };
}

async function fillFreeTextWithReview(
  adapter: FormAdapter,
  currentResult: FillResult
): Promise<FillResult> {
  const freeTextFields = detectFreeTextFields(adapter);
  if (freeTextFields.length === 0) {
    return currentResult;
  }

  const context = extractPageContext();
  const drafts = (await browser.runtime.sendMessage({
    type: 'GENERATE_FREE_TEXT_DRAFTS',
    prompts: freeTextFields.map((item) => ({
      fieldId: item.fieldId,
      question: item.question,
      ...context,
    })),
  })) as {
    fieldId: string;
    question: string;
    answer: string;
    source: 'cache-exact' | 'cache-semantic-reuse' | 'llm-generated' | 'llm-adapted';
  }[];

  const decisions = await showFreeTextReview(drafts);
  const decisionMap = new Map(decisions.map((decision) => [decision.fieldId, decision]));
  const savedResponses: {
    question: string;
    answer: string;
    source: 'manual' | 'llm-generated' | 'llm-edited';
  }[] = [];

  for (const item of freeTextFields) {
    const decision = decisionMap.get(item.fieldId);
    if (!decision || !decision.accepted) {
      currentResult.skipped++;
      currentResult.total++;
      currentResult.fields.push({ label: item.question, status: 'skipped' });
      continue;
    }

    adapter.fillField(item.field, decision.answer);
    currentResult.filled++;
    currentResult.total++;
    currentResult.fields.push({
      label: item.question,
      status: 'filled',
      value: decision.answer,
    });

    savedResponses.push({
      question: item.question,
      answer: decision.answer,
      source:
        decision.edited ||
        decision.draftSource === 'cache-exact' ||
        decision.draftSource === 'cache-semantic-reuse'
          ? 'llm-edited'
          : 'llm-generated',
    });
  }

  if (savedResponses.length > 0) {
    await browser.runtime.sendMessage({
      type: 'SAVE_RESPONSES_BATCH',
      responses: savedResponses,
    });
  }

  return currentResult;
}

function installRunListener(): void {
  const contentWindow = window as ContentWindow;
  if (contentWindow.__autoApplyRunListenerInstalled) {
    return;
  }
  contentWindow.__autoApplyRunListenerInstalled = true;

  browser.runtime.onMessage.addListener(
    (message: unknown): Promise<RunAutofillResult> | undefined => {
      if (!isRunAutofillMessage(message)) {
        return undefined;
      }

      return runAutofill();
    }
  );

  console.log('[Auto Apply] Content run listener installed');
}

installRunListener();
