import { cosineSimilarity, embedText, embedTextBatch } from '@/background/ai/embeddings';

describe('embeddings utilities', () => {
  describe('hash-based fallback (no API key)', () => {
    it('creates deterministic vectors with fixed dimension', async () => {
      const a = await embedText('building scalable systems');
      const b = await embedText('building scalable systems');

      expect(a).toHaveLength(256);
      expect(a).toEqual(b);
    });

    it('returns similarity of 1 for identical vectors', async () => {
      const a = await embedText('distributed systems');
      const score = cosineSimilarity(a, a);
      expect(score).toBeCloseTo(1, 6);
    });

    it('returns lower similarity for unrelated texts', async () => {
      const a = await embedText('kubernetes platform engineering');
      const b = await embedText('graphic design illustration');
      const score = cosineSimilarity(a, b);
      expect(score).toBeLessThan(0.7);
    });
  });

  describe('cosine similarity edge cases', () => {
    it('returns 0 when vector shapes are incompatible', () => {
      expect(cosineSimilarity([1, 2], [1])).toBe(0);
    });

    it('returns 0 for empty vectors', () => {
      expect(cosineSimilarity([], [])).toBe(0);
    });

    it('returns 0 for zero vectors', () => {
      expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
    });
  });

  describe('OpenAI API path', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('calls OpenAI API and returns embedding on success', async () => {
      const fakeEmbedding = Array.from({ length: 256 }, (_, i) => i * 0.01);
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ index: 0, embedding: fakeEmbedding }],
            }),
        })
      );

      const result = await embedText('test query', 'sk-test-key');
      expect(result).toEqual(fakeEmbedding);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-test-key',
          }),
        })
      );
    });

    it('falls back to hash when API returns non-ok response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
        })
      );

      const result = await embedText('test query', 'sk-test-key');
      expect(result).toHaveLength(256);
      // Should be deterministic hash-based result
      const hashResult = await embedText('test query');
      expect(result).toEqual(hashResult);
    });

    it('falls back to hash when API returns malformed response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        })
      );

      const result = await embedText('test query', 'sk-test-key');
      const hashResult = await embedText('test query');
      expect(result).toEqual(hashResult);
    });

    it('falls back to hash when fetch throws', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error'))
      );

      const result = await embedText('test query', 'sk-test-key');
      const hashResult = await embedText('test query');
      expect(result).toEqual(hashResult);
    });
  });

  describe('batch embedding', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns empty array for empty input', async () => {
      const result = await embedTextBatch([]);
      expect(result).toEqual([]);
    });

    it('uses hash fallback when no API key', async () => {
      const result = await embedTextBatch(['hello', 'world']);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(256);
      expect(result[1]).toHaveLength(256);
    });

    it('calls OpenAI API with array input and returns sorted embeddings', async () => {
      const emb0 = Array.from({ length: 256 }, () => 0.1);
      const emb1 = Array.from({ length: 256 }, () => 0.2);
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                { index: 1, embedding: emb1 },
                { index: 0, embedding: emb0 },
              ],
            }),
        })
      );

      const result = await embedTextBatch(['first', 'second'], 'sk-test-key');
      expect(result).toEqual([emb0, emb1]);
    });

    it('falls back to hash when batch API fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 429 })
      );

      const result = await embedTextBatch(['hello', 'world'], 'sk-test-key');
      expect(result).toHaveLength(2);
      const hashResult0 = await embedText('hello');
      expect(result[0]).toEqual(hashResult0);
    });
  });
});
