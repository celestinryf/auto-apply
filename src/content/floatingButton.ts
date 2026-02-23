import type { FillResult } from '@/shared/types';

const BUTTON_ID = 'auto-apply-floating-btn';
const OVERLAY_ID = 'auto-apply-overlay';

export function injectFloatingButton(onClick: () => void): void {
  if (document.getElementById(BUTTON_ID)) return;

  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.textContent = 'Auto Fill';
  button.title = 'Auto Apply — Fill application fields';
  button.addEventListener('click', onClick);

  Object.assign(button.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '2147483647',
    padding: '12px 20px',
    backgroundColor: '#4F46E5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
    transition: 'all 0.2s ease',
  });

  button.addEventListener('mouseenter', () => {
    button.style.backgroundColor = '#4338CA';
    button.style.transform = 'scale(1.05)';
  });
  button.addEventListener('mouseleave', () => {
    button.style.backgroundColor = '#4F46E5';
    button.style.transform = 'scale(1)';
  });

  document.body.appendChild(button);
}

export function showFillResults(result: FillResult): void {
  // Remove existing overlay
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;

  Object.assign(overlay.style, {
    position: 'fixed',
    bottom: '80px',
    right: '24px',
    zIndex: '2147483647',
    backgroundColor: '#fff',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '16px',
    maxWidth: '320px',
    maxHeight: '400px',
    overflowY: 'auto',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    color: '#1F2937',
  });

  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  });

  const title = document.createElement('strong');
  title.textContent = `Filled ${result.filled}/${result.total} fields`;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '\u00d7';
  Object.assign(closeBtn.style, {
    border: 'none',
    background: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#6B7280',
    padding: '0 4px',
  });
  closeBtn.addEventListener('click', () => overlay.remove());

  header.appendChild(title);
  header.appendChild(closeBtn);
  overlay.appendChild(header);

  if (result.fields.length > 0) {
    const list = document.createElement('div');
    for (const field of result.fields) {
      const item = document.createElement('div');
      Object.assign(item.style, {
        padding: '4px 0',
        borderBottom: '1px solid #F3F4F6',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      });

      const icon = document.createElement('span');
      icon.textContent = field.status === 'filled' ? '\u2713' : '\u2022';
      icon.style.color = field.status === 'filled' ? '#10B981' : '#F59E0B';
      icon.style.fontWeight = 'bold';

      const text = document.createElement('span');
      text.textContent = field.label || '(unnamed field)';
      if (field.status === 'skipped') {
        text.style.color = '#9CA3AF';
      }

      item.appendChild(icon);
      item.appendChild(text);
      list.appendChild(item);
    }
    overlay.appendChild(list);
  }

  document.body.appendChild(overlay);

  // Auto-dismiss after 10 seconds
  setTimeout(() => overlay.remove(), 10000);
}

export function setButtonLoading(loading: boolean): void {
  const button = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;
  if (!button) return;

  if (loading) {
    button.textContent = 'Filling...';
    button.disabled = true;
    button.style.opacity = '0.7';
  } else {
    button.textContent = 'Auto Fill';
    button.disabled = false;
    button.style.opacity = '1';
  }
}
