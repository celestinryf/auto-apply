import type { FormAdapter, FormField } from '@/shared/types';

export interface DetectedFreeTextField {
  fieldId: string;
  field: FormField;
  question: string;
}

export interface PageContext {
  jobTitle?: string;
  company?: string;
  jobDescriptionSnippet?: string;
}

const LONG_ANSWER_HINTS = [
  /why/i,
  /describe/i,
  /tell us/i,
  /cover letter/i,
  /additional information/i,
  /motivation/i,
  /experience/i,
  /accomplishment/i,
];

export function detectFreeTextFields(adapter: FormAdapter): DetectedFreeTextField[] {
  const fields = adapter.getFields();
  const freeText = fields.filter((field) => {
    if (field.type === 'textarea') return true;
    if (field.type !== 'text') return false;

    const input = field.element as HTMLInputElement;
    const maxLength = Number(input.maxLength);
    return maxLength >= 200 || LONG_ANSWER_HINTS.some((pattern) => pattern.test(field.label));
  });

  return freeText.map((field, index) => ({
    fieldId: buildFieldId(field, index),
    field,
    question: field.label || field.name || `Question ${index + 1}`,
  }));
}

export function extractPageContext(): PageContext {
  const title =
    document.querySelector<HTMLElement>('h1.app-title, h1.job-title, #header h1, h1')
      ?.textContent?.trim() ?? '';
  const company =
    document.querySelector<HTMLElement>(
      '.company-name, .app-company-name, [data-company], #header .company'
    )?.textContent?.trim() ?? '';

  const descriptionRoot =
    document.querySelector<HTMLElement>(
      '#content .section-wrapper, .job-description, #description, .opening'
    ) ?? document.body;
  const snippet = (descriptionRoot.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 1200);

  return {
    jobTitle: title || undefined,
    company: company || undefined,
    jobDescriptionSnippet: snippet || undefined,
  };
}

function buildFieldId(field: FormField, index: number): string {
  const id = field.element.id || field.name || field.label || String(index);
  return `ft-${id.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}-${index}`;
}
