import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { getSettings, saveSettings } from '@/storage/index';
import { createDefaultSettings, type Settings } from '@/shared/types';

const settings = signal<Settings>(createDefaultSettings());
const status = signal<{ type: 'success' | 'error'; message: string } | null>(null);
const showAnthropicKey = signal(false);
const showOpenAiKey = signal(false);

export function SettingsPage() {
  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      settings.value = await getSettings();
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  async function handleSaveSettings() {
    try {
      await saveSettings(settings.value);
      status.value = { type: 'success', message: 'Settings saved!' };
      setTimeout(() => (status.value = null), 2000);
    } catch (err) {
      status.value = { type: 'error', message: 'Failed to save settings' };
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
          Resume parsing and free-text generation use Anthropic/OpenAI with provider fallback.
          Keys stay in local extension storage.
        </p>
        <div class="form-group">
          <label class="form-label">Primary Provider</label>
          <select
            class="form-select"
            value={settings.value.primaryProvider}
            onChange={(e) =>
              (settings.value = {
                ...settings.value,
                primaryProvider: (e.target as HTMLSelectElement).value as
                  | 'anthropic'
                  | 'openai',
              })
            }
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Anthropic API Key</label>
          <div style="display: flex; gap: 8px">
            <input
              class="form-input"
              type={showAnthropicKey.value ? 'text' : 'password'}
              value={settings.value.anthropicApiKey}
              placeholder="sk-ant-..."
              onInput={(e) =>
                (settings.value = {
                  ...settings.value,
                  anthropicApiKey: (e.target as HTMLInputElement).value,
                })
              }
            />
            <button
              class="btn btn-secondary btn-sm"
              onClick={() => (showAnthropicKey.value = !showAnthropicKey.value)}
            >
              {showAnthropicKey.value ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">OpenAI API Key</label>
          <div style="display: flex; gap: 8px">
            <input
              class="form-input"
              type={showOpenAiKey.value ? 'text' : 'password'}
              value={settings.value.openaiApiKey}
              placeholder="sk-proj-..."
              onInput={(e) =>
                (settings.value = {
                  ...settings.value,
                  openaiApiKey: (e.target as HTMLInputElement).value,
                })
              }
            />
            <button
              class="btn btn-secondary btn-sm"
              onClick={() => (showOpenAiKey.value = !showOpenAiKey.value)}
            >
              {showOpenAiKey.value ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <button class="btn btn-primary" onClick={handleSaveSettings}>
          Save Settings
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
