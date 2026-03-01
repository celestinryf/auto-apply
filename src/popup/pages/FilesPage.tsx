import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import browser from 'webextension-polyfill';
import type { FilePurpose, UserProfile } from '@/shared/types';

interface FileEntry {
  id: number;
  name: string;
  mimeType: string;
  purpose: FilePurpose;
  createdAt: number;
  size?: number;
}

const files = signal<FileEntry[]>([]);
const loading = signal(true);
const error = signal<string | null>(null);
const uploading = signal(false);
const parseStatus = signal<string | null>(null);

export function FilesPage() {
  useEffect(() => {
    loadFiles();
  }, []);

  async function loadFiles() {
    try {
      const result = (await browser.runtime.sendMessage({
        type: 'GET_FILES',
      })) as FileEntry[];
      files.value = result ?? [];
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      loading.value = false;
    }
  }

  async function handleUpload(purpose: FilePurpose) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = purpose === 'resume' ? '.pdf,.doc,.docx' : '.pdf,.doc,.docx,.txt';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      uploading.value = true;
      error.value = null;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        await browser.runtime.sendMessage({
          type: 'SAVE_FILE',
          name: file.name,
          data: base64,
          mimeType: file.type,
          purpose,
        });

        await loadFiles();

        // Auto-parse resume PDFs into profile data
        if (purpose === 'resume' && file.type === 'application/pdf') {
          parseStatus.value = 'Parsing resume into profile...';
          try {
            const text = await extractTextFromPdf(file);
            if (text.trim()) {
              const profile = (await browser.runtime.sendMessage({
                type: 'PARSE_RESUME',
                text,
              })) as UserProfile;
              await browser.runtime.sendMessage({
                type: 'SAVE_PROFILE',
                profile,
              });
              parseStatus.value = 'Resume parsed and profile updated!';
              setTimeout(() => { parseStatus.value = null; }, 3000);
            }
          } catch {
            // File is saved, parsing is best-effort
            parseStatus.value = 'File saved, but could not auto-parse resume text.';
            setTimeout(() => { parseStatus.value = null; }, 3000);
          }
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to upload file';
      } finally {
        uploading.value = false;
      }
    };

    input.click();
  }

  async function handleDelete(id: number) {
    await browser.runtime.sendMessage({ type: 'DELETE_FILE', id });
    files.value = files.value.filter((f) => f.id !== id);
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

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }

  function purposeLabel(purpose: FilePurpose): string {
    switch (purpose) {
      case 'resume':
        return 'Resume';
      case 'cover-letter':
        return 'Cover Letter';
      default:
        return 'Other';
    }
  }

  if (loading.value) {
    return <div class="page">Loading...</div>;
  }

  return (
    <div class="page">
      <div class="page-title">Files</div>
      <p style="font-size: 12px; color: #6b7280; margin-bottom: 12px">
        Upload your resume and cover letter. These will be auto-attached to file upload
        fields when you run autofill.
      </p>

      {error.value && (
        <div class="status-bar status-error" style="margin-bottom: 12px">
          {error.value}
        </div>
      )}

      {parseStatus.value && (
        <div class="status-bar status-success" style="margin-bottom: 12px">
          {parseStatus.value}
        </div>
      )}

      <div style="display: flex; gap: 8px; margin-bottom: 16px">
        <button
          class="btn btn-primary"
          onClick={() => handleUpload('resume')}
          disabled={uploading.value}
        >
          {uploading.value ? 'Uploading...' : 'Upload Resume'}
        </button>
        <button
          class="btn btn-secondary"
          onClick={() => handleUpload('cover-letter')}
          disabled={uploading.value}
        >
          {uploading.value ? 'Uploading...' : 'Upload Cover Letter'}
        </button>
      </div>

      {files.value.length === 0 ? (
        <p style="color: #6b7280; text-align: center; padding: 32px 0">
          No files uploaded yet.
        </p>
      ) : (
        files.value.map((file) => (
          <div class="list-item" key={file.id}>
            <div class="list-item-header">
              <div>
                <strong style="font-size: 12px; color: #4b5563">{file.name}</strong>
                <div style="font-size: 11px; color: #9ca3af">
                  {purposeLabel(file.purpose)} &middot; {formatDate(file.createdAt)}
                </div>
              </div>
              <button class="btn btn-danger btn-sm" onClick={() => handleDelete(file.id)}>
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
