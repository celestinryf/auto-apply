import { signal } from '@preact/signals';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { ResponsesPage } from './pages/ResponsesPage';
import { FilesPage } from './pages/FilesPage';
import { RunPage } from './pages/RunPage';

type Tab = 'profile' | 'files' | 'responses' | 'run' | 'settings';

const activeTab = signal<Tab>('profile');

const tabs: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'files', label: 'Files' },
  { id: 'responses', label: 'Responses' },
  { id: 'run', label: 'Run' },
  { id: 'settings', label: 'Settings' },
];

export function App() {
  return (
    <div class="popup-container">
      <nav class="nav-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            class={`nav-tab ${activeTab.value === tab.id ? 'active' : ''}`}
            onClick={() => (activeTab.value = tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div>
        {activeTab.value === 'profile' && <ProfilePage />}
        {activeTab.value === 'files' && <FilesPage />}
        {activeTab.value === 'responses' && <ResponsesPage />}
        {activeTab.value === 'run' && <RunPage />}
        {activeTab.value === 'settings' && <SettingsPage />}
      </div>
    </div>
  );
}
