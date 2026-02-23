import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { getApiKey, saveApiKey } from '@/storage/index';

const apiKey = signal('');
const status = signal<{ type: 'success' | 'error'; message: string } | null>(null);
const showKey = signal(false);

export function SettingsPage() {
  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      apiKey.value = await getApiKey();
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  async function handleSaveKey() {
    try {
      await saveApiKey(apiKey.value);
      status.value = { type: 'success', message: 'API key saved!' };
      setTimeout(() => (status.value = null), 2000);
    } catch (err) {
      status.value = { type: 'error', message: 'Failed to save API key' };
    }
  }

  return (
    <div class="page">
      <div class="page-title">Settings</div>

      {status.value && (
        <div class={`status-bar status-${status.value.type}`}>{status.value.message}</div>
      )}

      <div class="form-section">
        <div class="form-section-title">API Configuration</div>
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 12px">
          An Anthropic API key is required for resume parsing and AI-powered form filling.
          Your key is stored locally and never sent to our servers.
        </p>
        <div class="form-group">
          <label class="form-label">Anthropic API Key</label>
          <div style="display: flex; gap: 8px">
            <input
              class="form-input"
              type={showKey.value ? 'text' : 'password'}
              value={apiKey.value}
              placeholder="sk-ant-..."
              onInput={(e) => (apiKey.value = (e.target as HTMLInputElement).value)}
            />
            <button
              class="btn btn-secondary btn-sm"
              onClick={() => (showKey.value = !showKey.value)}
            >
              {showKey.value ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <button class="btn btn-primary" onClick={handleSaveKey}>
          Save API Key
        </button>
      </div>

      <div class="form-section" style="margin-top: 24px">
        <div class="form-section-title">About</div>
        <p style="font-size: 12px; color: #6b7280">
          Auto Apply v0.1.0
          <br />
          Auto-fill job applications with your profile data.
          <br />
          All data is stored locally on your device.
        </p>
      </div>
    </div>
  );
}
