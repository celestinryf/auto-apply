import type { MessageType } from '@/shared/types';

let messageListener:
  | ((message: unknown) => Promise<unknown> | undefined)
  | undefined;

vi.mock('webextension-polyfill', () => ({
  default: {
    runtime: {
      onMessage: {
        addListener: vi.fn((listener: (message: unknown) => Promise<unknown> | undefined) => {
          messageListener = listener;
        }),
      },
    },
  },
}));

const storageMocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  saveProfile: vi.fn(),
  getResponse: vi.fn(),
  saveResponse: vi.fn(),
  getApiKey: vi.fn(),
  saveApiKey: vi.fn(),
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
  saveFile: vi.fn(),
  getFilesByPurpose: vi.fn(),
  getAllFiles: vi.fn(),
  deleteFile: vi.fn(),
}));

vi.mock('@/storage/index', () => storageMocks);

const resumeParserMocks = vi.hoisted(() => ({
  parseResumeText: vi.fn(),
}));
vi.mock('@/background/resumeParser', () => resumeParserMocks);

const freeTextMocks = vi.hoisted(() => ({
  generateFreeTextDrafts: vi.fn(),
  persistResponsesBatch: vi.fn(),
}));
vi.mock('@/background/freeText', () => freeTextMocks);

async function setupListener() {
  vi.resetModules();
  messageListener = undefined;
  await import('@/background/index');
  expect(messageListener).toBeTypeOf('function');
  return messageListener!;
}

describe('background message handlers', () => {
  beforeEach(() => {
    Object.values(storageMocks).forEach((fn) => fn.mockReset());
    Object.values(resumeParserMocks).forEach((fn) => fn.mockReset());
    Object.values(freeTextMocks).forEach((fn) => fn.mockReset());
  });

  it('routes GET_PROFILE to storage', async () => {
    const profile = { personal: { firstName: 'A' } };
    storageMocks.getProfile.mockResolvedValue(profile);
    const listener = await setupListener();

    const result = await listener({ type: 'GET_PROFILE' } as MessageType);

    expect(storageMocks.getProfile).toHaveBeenCalledOnce();
    expect(result).toBe(profile);
  });

  it('routes PARSE_RESUME through settings + parser', async () => {
    const listener = await setupListener();
    storageMocks.getSettings.mockResolvedValue({ primaryProvider: 'anthropic' });
    resumeParserMocks.parseResumeText.mockResolvedValue({ ok: true });

    const result = await listener({ type: 'PARSE_RESUME', text: 'resume text' });

    expect(storageMocks.getSettings).toHaveBeenCalledOnce();
    expect(resumeParserMocks.parseResumeText).toHaveBeenCalledWith('resume text', {
      primaryProvider: 'anthropic',
    });
    expect(result).toEqual({ ok: true });
  });

  it('routes GENERATE_FREE_TEXT_DRAFTS through settings + freeText service', async () => {
    const listener = await setupListener();
    storageMocks.getSettings.mockResolvedValue({ primaryProvider: 'openai' });
    freeTextMocks.generateFreeTextDrafts.mockResolvedValue([{ fieldId: 'f1' }]);

    const prompts = [{ fieldId: 'f1', question: 'Why?' }];
    const result = await listener({ type: 'GENERATE_FREE_TEXT_DRAFTS', prompts });

    expect(storageMocks.getSettings).toHaveBeenCalledOnce();
    expect(freeTextMocks.generateFreeTextDrafts).toHaveBeenCalledWith(prompts, {
      primaryProvider: 'openai',
    });
    expect(result).toEqual([{ fieldId: 'f1' }]);
  });

  it('routes SAVE_RESPONSES_BATCH through settings + persistence service', async () => {
    const listener = await setupListener();
    const settings = { primaryProvider: 'anthropic', openaiApiKey: 'k' };
    storageMocks.getSettings.mockResolvedValue(settings);
    const responses = [{ question: 'Q', answer: 'A', source: 'llm-generated' as const }];

    await listener({ type: 'SAVE_RESPONSES_BATCH', responses });

    expect(storageMocks.getSettings).toHaveBeenCalled();
    expect(freeTextMocks.persistResponsesBatch).toHaveBeenCalledWith(responses, settings);
  });

  it('routes GET_FILE_FOR_PURPOSE to storage and returns base64', async () => {
    const listener = await setupListener();
    const fileData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    storageMocks.getFilesByPurpose.mockResolvedValue([
      { id: 1, name: 'resume.pdf', mimeType: 'application/pdf', data: fileData.buffer, purpose: 'resume', createdAt: Date.now() },
    ]);

    const result = await listener({ type: 'GET_FILE_FOR_PURPOSE', purpose: 'resume' }) as { name: string; data: string; mimeType: string };

    expect(storageMocks.getFilesByPurpose).toHaveBeenCalledWith('resume');
    expect(result).toMatchObject({ name: 'resume.pdf', mimeType: 'application/pdf' });
    expect(typeof result.data).toBe('string'); // base64
  });

  it('routes GET_FILE_FOR_PURPOSE returns null when no files', async () => {
    const listener = await setupListener();
    storageMocks.getFilesByPurpose.mockResolvedValue([]);

    const result = await listener({ type: 'GET_FILE_FOR_PURPOSE', purpose: 'cover-letter' });

    expect(result).toBeNull();
  });

  it('routes SAVE_FILE to storage with decoded ArrayBuffer', async () => {
    const listener = await setupListener();
    storageMocks.saveFile.mockResolvedValue(1);
    const base64 = btoa('Hello');

    await listener({
      type: 'SAVE_FILE',
      name: 'resume.pdf',
      data: base64,
      mimeType: 'application/pdf',
      purpose: 'resume',
    });

    expect(storageMocks.saveFile).toHaveBeenCalledWith(
      'resume.pdf',
      expect.any(ArrayBuffer),
      'application/pdf',
      'resume'
    );
  });

  it('routes GET_FILES to storage and strips data field', async () => {
    const listener = await setupListener();
    const fileData = new Uint8Array([72, 101, 108, 108, 111]).buffer;
    const fileList = [
      { id: 1, name: 'test.pdf', mimeType: 'application/pdf', data: fileData, purpose: 'resume', createdAt: Date.now() },
    ];
    storageMocks.getAllFiles.mockResolvedValue(fileList);

    const result = await listener({ type: 'GET_FILES' }) as Record<string, unknown>[];

    expect(storageMocks.getAllFiles).toHaveBeenCalledOnce();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 1, name: 'test.pdf' });
    expect(result[0]).not.toHaveProperty('data');
  });

  it('routes DELETE_FILE to storage', async () => {
    const listener = await setupListener();
    storageMocks.deleteFile.mockResolvedValue(undefined);

    await listener({ type: 'DELETE_FILE', id: 42 });

    expect(storageMocks.deleteFile).toHaveBeenCalledWith(42);
  });

  it('returns undefined for unknown/invalid messages', async () => {
    const listener = await setupListener();
    const result = await listener({ type: 'UNKNOWN_ACTION' });
    expect(result).toBeUndefined();
  });
});
