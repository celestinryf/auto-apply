import path from 'path';
import { test, expect } from '@playwright/test';

const contentScriptPath = path.resolve(
  process.cwd(),
  'dist',
  'chrome',
  'src',
  'content',
  'index.js'
);

test('critical path smoke: auto fill + review + save batch', async ({ page }) => {
  await page.addInitScript(() => {
    const profile = {
      personal: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: '',
        location: { city: '', state: '', country: '' },
        linkedIn: '',
        github: '',
        portfolio: '',
        website: '',
      },
      preferences: {
        authorizedToWork: true,
        requiresSponsorship: false,
        salaryExpectation: '',
        willingToRelocate: false,
        startDate: '',
      },
    };

    (window as { __savedResponses?: unknown[] }).__savedResponses = [];

    const chromeLike = {
      runtime: {
        id: 'test-extension-id',
        lastError: null,
        sendMessage: (
          message: {
            type: string;
            prompts?: { fieldId: string; question: string }[];
            responses?: unknown[];
          },
          callback?: (value: unknown) => void
        ) => {
          let result: unknown = null;

          if (message.type === 'GET_PROFILE') {
            result = profile;
          } else if (message.type === 'GENERATE_FREE_TEXT_DRAFTS') {
            result = (message.prompts ?? []).map((prompt) => ({
              fieldId: prompt.fieldId,
              question: prompt.question,
              answer: 'Generated draft answer',
              source: 'llm-generated',
            }));
          } else if (message.type === 'SAVE_RESPONSES_BATCH') {
            (window as { __savedResponses?: unknown[] }).__savedResponses =
              message.responses ?? [];
            result = { ok: true };
          }

          if (typeof callback === 'function') {
            callback(result);
          }
        },
      },
    };

    (window as { chrome?: unknown }).chrome = chromeLike;
  });

  const html = `
    <form id="application_form">
      <label for="first_name">First Name</label>
      <input id="first_name" name="first_name" />

      <label for="motivation">Why do you want this role?</label>
      <textarea id="motivation" name="motivation"></textarea>
    </form>
  `;
  await page.goto(`data:text/html,${encodeURIComponent(html)}`);

  await page.addScriptTag({ path: contentScriptPath });

  await expect(page.locator('#auto-apply-floating-btn')).toBeVisible();
  await page.locator('#auto-apply-floating-btn').click();

  await expect(page.locator('#auto-apply-free-text-review')).toBeVisible();
  await page.getByRole('button', { name: 'Fill Accepted' }).click();

  await expect(page.locator('#first_name')).toHaveValue('Ada');
  await expect(page.locator('#motivation')).toHaveValue('Generated draft answer');

  const savedResponses = await page.evaluate(
    () => (window as unknown as { __savedResponses?: unknown[] }).__savedResponses ?? []
  );
  expect(savedResponses).toHaveLength(1);
});
