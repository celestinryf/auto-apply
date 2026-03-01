import browser from 'webextension-polyfill';
import type { FormField, FilePurpose } from '@/shared/types';

export interface FileFieldResult {
  filled: number;
  skipped: number;
  fields: { label: string; status: 'filled' | 'skipped' }[];
}

interface FileResponse {
  name: string;
  data: string; // base64-encoded
  mimeType: string;
}

export async function fillFileFields(fields: FormField[]): Promise<FileFieldResult> {
  const result: FileFieldResult = { filled: 0, skipped: 0, fields: [] };

  for (const field of fields) {
    const el = field.element as HTMLInputElement;
    const purpose = guessFilePurpose(field);

    const fileData = (await browser.runtime.sendMessage({
      type: 'GET_FILE_FOR_PURPOSE',
      purpose,
    })) as FileResponse | null;

    if (!fileData) {
      result.skipped++;
      result.fields.push({ label: field.label || field.name, status: 'skipped' });
      continue;
    }

    try {
      const buffer = base64ToArrayBuffer(fileData.data);
      const file = new File([buffer], fileData.name, { type: fileData.mimeType });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      el.files = dataTransfer.files;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      result.filled++;
      result.fields.push({ label: field.label || field.name, status: 'filled' });
    } catch {
      result.skipped++;
      result.fields.push({ label: field.label || field.name, status: 'skipped' });
    }
  }

  return result;
}

export function guessFilePurpose(field: FormField): FilePurpose {
  const text = `${field.label} ${field.name}`.toLowerCase();
  if (/resume|cv|curriculum\s*vitae/i.test(text)) return 'resume';
  if (/cover[\s_-]*letter/i.test(text)) return 'cover-letter';
  return 'resume'; // default to resume for unlabeled file inputs
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
