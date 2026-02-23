import { signal } from '@preact/signals';
import type { UserProfile } from '@/shared/types';
import browser from 'webextension-polyfill';

interface Props {
  onParsed: (profile: UserProfile) => void;
}

const uploading = signal(false);
const error = signal<string | null>(null);

export function ResumeUpload({ onParsed }: Props) {
  async function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      error.value = 'Only PDF files are supported.';
      return;
    }

    uploading.value = true;
    error.value = null;

    try {
      const text = await extractTextFromPdf(file);

      if (!text.trim()) {
        error.value = 'Could not extract text from PDF. The file may be image-based.';
        return;
      }

      const profile = (await browser.runtime.sendMessage({
        type: 'PARSE_RESUME',
        text,
      })) as UserProfile;

      onParsed(profile);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse resume';
      error.value = message;
    } finally {
      uploading.value = false;
      input.value = '';
    }
  }

  async function extractTextFromPdf(file: File): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      pages.push(text);
    }

    return pages.join('\n\n');
  }

  return (
    <div class="form-section">
      <div class="form-section-title">Resume Upload</div>
      <label class="file-upload" style={uploading.value ? 'opacity: 0.6; pointer-events: none' : ''}>
        <input
          type="file"
          accept=".pdf"
          style="display: none"
          onChange={handleFileSelect}
        />
        <div class="file-upload-text">
          {uploading.value
            ? 'Parsing resume...'
            : 'Click to upload your resume (PDF)'}
        </div>
      </label>
      {error.value && (
        <p style="color: #dc2626; font-size: 12px; margin-top: 8px">{error.value}</p>
      )}
    </div>
  );
}
