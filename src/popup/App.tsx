import { signal } from '@preact/signals';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { ResponsesPage } from './pages/ResponsesPage';

type Tab = 'profile' | 'responses' | 'settings';

const activeTab = signal<Tab>('profile');

const tabs: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'responses', label: 'Responses' },
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
        {activeTab.value === 'responses' && <ResponsesPage />}
        {activeTab.value === 'settings' && <SettingsPage />}
      </div>
    </div>
  );
}
