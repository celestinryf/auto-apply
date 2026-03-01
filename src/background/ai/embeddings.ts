const EMBEDDING_DIMENSION = 256;

export async function embedText(text: string, openaiApiKey?: string): Promise<number[]> {
  if (!openaiApiKey) {
    return hashBasedEmbedding(text);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: EMBEDDING_DIMENSION,
      }),
    });

    if (!response.ok) {
      console.warn('[Auto Apply] OpenAI embedding API error, falling back to hash');
      return hashBasedEmbedding(text);
    }

    const data = await response.json();
    const embedding = parseEmbeddingResponse(data);
    if (!embedding) {
      console.warn('[Auto Apply] Malformed embedding response, falling back to hash');
      return hashBasedEmbedding(text);
    }

    return embedding;
  } catch {
    console.warn('[Auto Apply] OpenAI embedding request failed, falling back to hash');
    return hashBasedEmbedding(text);
  }
}

export async function embedTextBatch(
  texts: string[],
  openaiApiKey?: string
): Promise<number[][]> {
  if (texts.length === 0) return [];

  if (!openaiApiKey) {
    return texts.map((t) => hashBasedEmbedding(t));
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts,
        dimensions: EMBEDDING_DIMENSION,
      }),
    });

    if (!response.ok) {
      console.warn('[Auto Apply] OpenAI batch embedding API error, falling back to hash');
      return texts.map((t) => hashBasedEmbedding(t));
    }

    const data = await response.json();
    const embeddings = parseBatchEmbeddingResponse(data, texts.length);
    if (!embeddings) {
      console.warn('[Auto Apply] Malformed batch embedding response, falling back to hash');
      return texts.map((t) => hashBasedEmbedding(t));
    }

    return embeddings;
  } catch {
    console.warn('[Auto Apply] OpenAI batch embedding request failed, falling back to hash');
    return texts.map((t) => hashBasedEmbedding(t));
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function parseEmbeddingResponse(data: unknown): number[] | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.data) || obj.data.length === 0) return null;

  const first = obj.data[0] as Record<string, unknown>;
  if (!first || !Array.isArray(first.embedding)) return null;

  const embedding = first.embedding as unknown[];
  if (embedding.length === 0 || typeof embedding[0] !== 'number') return null;

  return embedding as number[];
}

function parseBatchEmbeddingResponse(
  data: unknown,
  expectedCount: number
): number[][] | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.data) || obj.data.length !== expectedCount) return null;

  const sorted = [...(obj.data as { index: number; embedding: unknown }[])].sort(
    (a, b) => a.index - b.index
  );

  const results: number[][] = [];
  for (const item of sorted) {
    if (!Array.isArray(item.embedding)) return null;
    if (item.embedding.length === 0 || typeof item.embedding[0] !== 'number') return null;
    results.push(item.embedding as number[]);
  }

  return results;
}

function hashBasedEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSION).fill(0);
  const tokens = tokenize(text);
  if (tokens.length === 0) return vector;

  for (const token of tokens) {
    const index = hash(token) % EMBEDDING_DIMENSION;
    vector[index] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) return vector;
  return vector.map((value) => value / magnitude);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
}
