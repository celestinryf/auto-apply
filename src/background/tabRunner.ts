import browser from 'webextension-polyfill';
import type { RunAutofillResult } from '@/shared/types';

const CONTENT_SCRIPT_FILE = 'src/content/index.js';

export async function runAutofillOnActiveTab(): Promise<RunAutofillResult> {
  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) {
    throw new Error('No active tab found.');
  }

  if (!activeTab.url || !/^https?:/i.test(activeTab.url)) {
    throw new Error('Autofill can only run on normal web pages (http/https).');
  }

  await ensureContentScriptInjected(activeTab.id);

  try {
    const response = (await browser.tabs.sendMessage(activeTab.id, {
      type: 'RUN_AUTOFILL',
    })) as RunAutofillResult;
    if (!response || typeof response !== 'object') {
      throw new Error('Autofill run returned an unexpected response.');
    }
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to run autofill on current tab: ${message}`);
  }
}

async function ensureContentScriptInjected(tabId: number): Promise<void> {
  const browserWithScripting = browser as unknown as {
    scripting?: {
      executeScript: (details: {
        target: { tabId: number };
        files: string[];
      }) => Promise<unknown>;
    };
  };

  if (browserWithScripting.scripting?.executeScript) {
    await browserWithScripting.scripting.executeScript({
      target: { tabId },
      files: [CONTENT_SCRIPT_FILE],
    });
    return;
  }

  const tabsWithExecuteScript = browser.tabs as unknown as {
    executeScript?: (
      tabId: number,
      details: { file: string }
    ) => Promise<unknown>;
  };

  if (tabsWithExecuteScript.executeScript) {
    await tabsWithExecuteScript.executeScript(tabId, { file: CONTENT_SCRIPT_FILE });
    return;
  }

  throw new Error('Runtime content script injection is not supported in this browser.');
}
