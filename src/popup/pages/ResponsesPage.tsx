import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import type { CustomResponse } from '@/shared/types';
import { getAllResponses, deleteResponse, saveResponse } from '@/storage/index';

const responses = signal<CustomResponse[]>([]);
const loading = signal(true);

export function ResponsesPage() {
  useEffect(() => {
    loadResponses();
  }, []);

  async function loadResponses() {
    try {
      responses.value = await getAllResponses();
    } catch (err) {
      console.error('Failed to load responses:', err);
    } finally {
      loading.value = false;
    }
  }

  async function handleDelete(id: number) {
    await deleteResponse(id);
    responses.value = responses.value.filter((r) => r.id !== id);
  }

  async function handleEdit(id: number, answer: string) {
    const resp = responses.value.find((r) => r.id === id);
    if (!resp) return;
    await saveResponse(resp.question, answer);
    responses.value = responses.value.map((r) =>
      r.id === id ? { ...r, answer, updatedAt: Date.now() } : r
    );
  }

  if (loading.value) {
    return <div class="page">Loading...</div>;
  }

  return (
    <div class="page">
      <div class="page-title">Saved Responses</div>
      {responses.value.length === 0 ? (
        <p style="color: #6b7280; text-align: center; padding: 32px 0">
          No saved responses yet. Responses will appear here as you fill applications.
        </p>
      ) : (
        responses.value.map((resp) => (
          <div class="list-item" key={resp.id}>
            <div class="list-item-header">
              <strong style="font-size: 12px; color: #4b5563">{resp.question}</strong>
              <button class="btn btn-danger btn-sm" onClick={() => handleDelete(resp.id!)}>
                Delete
              </button>
            </div>
            <textarea
              class="form-textarea"
              value={resp.answer}
              onBlur={(e) => handleEdit(resp.id!, (e.target as HTMLTextAreaElement).value)}
            />
          </div>
        ))
      )}
    </div>
  );
}
