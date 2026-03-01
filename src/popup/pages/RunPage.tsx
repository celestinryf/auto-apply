import { signal } from '@preact/signals';
import browser from 'webextension-polyfill';
import type { RunAutofillResult } from '@/shared/types';

const running = signal(false);
const lastResult = signal<RunAutofillResult | null>(null);
const error = signal<string | null>(null);

export function RunPage() {
  async function handleRunOnCurrentTab() {
    running.value = true;
    error.value = null;
    lastResult.value = null;

    try {
      const result = (await browser.runtime.sendMessage({
        type: 'RUN_AUTOFILL_ACTIVE_TAB',
      })) as RunAutofillResult;
      lastResult.value = result;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to run autofill on current tab.';
    } finally {
      running.value = false;
    }
  }

  return (
    <div class="page">
      <div class="page-title">Run</div>
      <p style="font-size: 12px; color: #6b7280; margin-bottom: 12px">
        Click the button below while viewing an application page to run autofill.
      </p>

      <button class="btn btn-primary" style="width: 100%" onClick={handleRunOnCurrentTab} disabled={running.value}>
        {running.value ? 'Running...' : 'Run Autofill On Current Tab'}
      </button>

      {error.value && (
        <div class="status-bar status-error" style="margin-top: 12px">
          {error.value}
        </div>
      )}

      {lastResult.value && (
        <div class="form-section" style="margin-top: 12px">
          <div class="form-section-title">Last Run Summary</div>
          <div class="list-item">
            <div>Detected: {lastResult.value.result.total}</div>
            <div>Filled: {lastResult.value.result.filled}</div>
            <div>Skipped: {lastResult.value.result.skipped}</div>
          </div>
          {lastResult.value.warnings.length > 0 && (
            <div class="list-item" style="margin-top: 8px">
              {lastResult.value.warnings.map((warning) => (
                <div key={warning} style="font-size: 12px; color: #92400e">
                  - {warning}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
