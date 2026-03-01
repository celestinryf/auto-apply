// @vitest-environment jsdom

import { showFreeTextReview } from '@/content/reviewOverlay';
import type { FreeTextDraft } from '@/shared/types';

describe('review overlay', () => {
  it('returns accept/edit/skip decisions from user interactions', async () => {
    const drafts: FreeTextDraft[] = [
      {
        fieldId: 'f1',
        question: 'Why this role?',
        answer: 'I like the mission.',
        source: 'llm-generated',
      },
      {
        fieldId: 'f2',
        question: 'Tell us about leadership experience',
        answer: 'I led a small team.',
        source: 'cache-semantic-reuse',
      },
    ];

    const promise = showFreeTextReview(drafts);

    const textareas = Array.from(document.querySelectorAll('textarea'));
    const checkboxes = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    );

    expect(textareas).toHaveLength(2);
    expect(checkboxes).toHaveLength(2);

    textareas[1].value = 'I led cross-functional teams across 3 projects.';
    checkboxes[0].checked = false;

    const applyButton = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent === 'Fill Accepted'
    );
    expect(applyButton).toBeTruthy();
    applyButton!.click();

    const decisions = await promise;

    expect(decisions).toHaveLength(2);
    expect(decisions[0]).toMatchObject({
      fieldId: 'f1',
      accepted: false,
      edited: false,
    });
    expect(decisions[1]).toMatchObject({
      fieldId: 'f2',
      accepted: true,
      edited: true,
      answer: 'I led cross-functional teams across 3 projects.',
    });
  });

  it('returns empty decisions when canceled', async () => {
    const promise = showFreeTextReview([
      {
        fieldId: 'f1',
        question: 'Question',
        answer: 'Answer',
        source: 'cache-exact',
      },
    ]);

    const cancelButton = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent === 'Cancel'
    );
    expect(cancelButton).toBeTruthy();
    cancelButton!.click();

    await expect(promise).resolves.toEqual([]);
  });
});
