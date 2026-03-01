// @vitest-environment jsdom

vi.mock('webextension-polyfill', () => ({
  default: {
    runtime: {
      sendMessage: vi.fn(),
    },
  },
}));

import { guessFilePurpose } from '@/content/fileFiller';
import type { FormField } from '@/shared/types';

function makeFileField(label: string, name: string): FormField {
  return {
    element: document.createElement('input'),
    type: 'file',
    label,
    name,
    required: false,
  };
}

describe('guessFilePurpose', () => {
  it('detects "resume" from label', () => {
    expect(guessFilePurpose(makeFileField('Upload Resume', 'file'))).toBe('resume');
  });

  it('detects "resume" from name attribute', () => {
    expect(guessFilePurpose(makeFileField('', 'resume_upload'))).toBe('resume');
  });

  it('detects "cv" as resume', () => {
    expect(guessFilePurpose(makeFileField('Upload your CV', 'cv'))).toBe('resume');
  });

  it('detects "curriculum vitae" as resume', () => {
    expect(guessFilePurpose(makeFileField('Curriculum Vitae', 'file'))).toBe('resume');
  });

  it('detects "cover letter" label', () => {
    expect(guessFilePurpose(makeFileField('Cover Letter', 'file'))).toBe('cover-letter');
  });

  it('detects "cover_letter" name', () => {
    expect(guessFilePurpose(makeFileField('', 'cover_letter'))).toBe('cover-letter');
  });

  it('detects "coverletter" without space', () => {
    expect(guessFilePurpose(makeFileField('Coverletter upload', 'file'))).toBe('cover-letter');
  });

  it('defaults to resume for unlabeled file inputs', () => {
    expect(guessFilePurpose(makeFileField('', ''))).toBe('resume');
  });

  it('defaults to resume for generic labels', () => {
    expect(guessFilePurpose(makeFileField('Upload file', 'attachment'))).toBe('resume');
  });

  it('is case-insensitive', () => {
    expect(guessFilePurpose(makeFileField('RESUME', 'FILE'))).toBe('resume');
    expect(guessFilePurpose(makeFileField('COVER LETTER', 'FILE'))).toBe('cover-letter');
  });
});
