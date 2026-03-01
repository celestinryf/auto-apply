// @vitest-environment jsdom

import { detectFreeTextFields, extractPageContext } from '@/content/freeText';
import type { FormAdapter, FormField } from '@/shared/types';

function adapterWithFields(fields: FormField[]): FormAdapter {
  return {
    name: 'FixtureAdapter',
    getFields: () => fields,
    fillField: vi.fn(),
  };
}

describe('free-text DOM detection', () => {
  it('detects textarea and long-answer text fields from fixture HTML', () => {
    document.body.innerHTML = `
      <h1 class="job-title">Senior Engineer</h1>
      <div class="company-name">Example Corp</div>
      <div id="description">Build reliable systems at scale.</div>
      <form id="application_form">
        <label for="motivation">Why do you want this role?</label>
        <textarea id="motivation" name="motivation"></textarea>

        <label for="summary">Additional information</label>
        <input id="summary" name="summary" type="text" maxlength="500" />

        <label for="first_name">First name</label>
        <input id="first_name" name="first_name" type="text" maxlength="30" />
      </form>
    `;

    const motivation = document.getElementById('motivation') as HTMLElement;
    const summary = document.getElementById('summary') as HTMLElement;
    const firstName = document.getElementById('first_name') as HTMLElement;

    const fields: FormField[] = [
      {
        element: motivation,
        type: 'textarea',
        label: 'Why do you want this role?',
        name: 'motivation',
        required: false,
      },
      {
        element: summary,
        type: 'text',
        label: 'Additional information',
        name: 'summary',
        required: false,
      },
      {
        element: firstName,
        type: 'text',
        label: 'First name',
        name: 'first_name',
        required: true,
      },
    ];

    const detected = detectFreeTextFields(adapterWithFields(fields));

    expect(detected).toHaveLength(2);
    expect(detected.map((item) => item.question)).toEqual([
      'Why do you want this role?',
      'Additional information',
    ]);
  });

  it('extracts job context from fixture HTML', () => {
    document.body.innerHTML = `
      <h1 class="job-title">Platform Engineer</h1>
      <div class="company-name">Orbit Labs</div>
      <div id="description">Own cloud reliability and developer platform operations.</div>
    `;

    const context = extractPageContext();

    expect(context.jobTitle).toBe('Platform Engineer');
    expect(context.company).toBe('Orbit Labs');
    expect(context.jobDescriptionSnippet).toContain('cloud reliability');
  });
});
