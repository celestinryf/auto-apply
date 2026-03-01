import type { FreeTextDraft } from '@/shared/types';

const OVERLAY_ID = 'auto-apply-free-text-review';

export interface ReviewDecision {
  fieldId: string;
  question: string;
  answer: string;
  accepted: boolean;
  edited: boolean;
  draftSource: FreeTextDraft['source'];
}

export function showFreeTextReview(drafts: FreeTextDraft[]): Promise<ReviewDecision[]> {
  return new Promise((resolve) => {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      background: 'rgba(15, 23, 42, 0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    });

    const modal = document.createElement('div');
    Object.assign(modal.style, {
      width: 'min(760px, 100%)',
      maxHeight: '85vh',
      overflowY: 'auto',
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
      boxShadow: '0 30px 80px rgba(2, 6, 23, 0.35)',
      padding: '16px',
    });

    const header = document.createElement('div');
    header.innerHTML = `
      <div style="font-size:16px;font-weight:700;color:#0f172a;">Review generated answers</div>
      <div style="margin-top:4px;font-size:12px;color:#475569;">Edit, accept, or skip each answer before filling.</div>
    `;
    modal.appendChild(header);

    const rows: {
      draft: FreeTextDraft;
      textarea: HTMLTextAreaElement;
      accepted: HTMLInputElement;
    }[] = [];

    for (const draft of drafts) {
      const card = document.createElement('div');
      Object.assign(card.style, {
        marginTop: '12px',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '12px',
      });

      const title = document.createElement('div');
      title.textContent = draft.question;
      Object.assign(title.style, {
        fontSize: '13px',
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: '8px',
      });
      card.appendChild(title);

      const meta = document.createElement('div');
      const similarity =
        typeof draft.similarity === 'number'
          ? ` (sim ${draft.similarity.toFixed(2)})`
          : '';
      meta.textContent = `Source: ${draft.source}${similarity}`;
      Object.assign(meta.style, {
        fontSize: '11px',
        color: '#64748b',
        marginBottom: '8px',
      });
      card.appendChild(meta);

      const textarea = document.createElement('textarea');
      textarea.value = draft.answer;
      Object.assign(textarea.style, {
        width: '100%',
        minHeight: '88px',
        resize: 'vertical',
        border: '1px solid #CBD5E1',
        borderRadius: '8px',
        padding: '8px',
        fontSize: '13px',
        color: '#0f172a',
      });
      card.appendChild(textarea);

      const controls = document.createElement('label');
      Object.assign(controls.style, {
        marginTop: '8px',
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
        fontSize: '12px',
        color: '#334155',
      });
      const accepted = document.createElement('input');
      accepted.type = 'checkbox';
      accepted.checked = true;
      controls.appendChild(accepted);
      controls.appendChild(document.createTextNode('Accept and fill this answer'));
      card.appendChild(controls);

      rows.push({ draft, textarea, accepted });
      modal.appendChild(card);
    }

    const footer = document.createElement('div');
    Object.assign(footer.style, {
      marginTop: '14px',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '8px',
    });

    const cancelButton = createButton('Cancel', '#E2E8F0', '#0f172a');
    cancelButton.onclick = () => {
      overlay.remove();
      resolve([]);
    };

    const applyButton = createButton('Fill Accepted', '#2563EB', '#ffffff');
    applyButton.onclick = () => {
      const decisions = rows.map(({ draft, textarea, accepted }) => ({
        fieldId: draft.fieldId,
        question: draft.question,
        answer: textarea.value.trim(),
        accepted: accepted.checked && textarea.value.trim().length > 0,
        edited: textarea.value.trim() !== draft.answer.trim(),
        draftSource: draft.source,
      }));
      overlay.remove();
      resolve(decisions);
    };

    footer.appendChild(cancelButton);
    footer.appendChild(applyButton);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  });
}

function createButton(label: string, background: string, color: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  Object.assign(button.style, {
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    background,
    color,
  });
  return button;
}
