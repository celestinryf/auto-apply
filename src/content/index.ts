import browser from 'webextension-polyfill';
import { detectATS } from './detector';
import { fillForm } from './filler';
import { injectFloatingButton, showFillResults, setButtonLoading } from './floatingButton';
import type { UserProfile } from '@/shared/types';

function init(): void {
  const adapter = detectATS();
  if (!adapter) {
    console.log('[Auto Apply] No supported ATS detected on this page');
    return;
  }

  console.log(`[Auto Apply] ${adapter.name} detected — injecting fill button`);

  injectFloatingButton(async () => {
    setButtonLoading(true);

    try {
      const profile = (await browser.runtime.sendMessage({
        type: 'GET_PROFILE',
      })) as UserProfile;

      if (!profile.personal.firstName && !profile.personal.email) {
        alert(
          'Auto Apply: No profile found. Please set up your profile in the extension popup first.'
        );
        return;
      }

      const result = fillForm(adapter, profile);
      showFillResults(result);
    } catch (err) {
      console.error('[Auto Apply] Fill error:', err);
      alert('Auto Apply: An error occurred while filling. Check the console for details.');
    } finally {
      setButtonLoading(false);
    }
  });
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
