// ---- User Profile ----

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  linkedIn: string;
  github: string;
  portfolio: string;
  website: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  highlights: string[];
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa?: string;
}

export interface Language {
  language: string;
  proficiency: string;
}

export interface Preferences {
  authorizedToWork: boolean;
  requiresSponsorship: boolean;
  salaryExpectation: string;
  willingToRelocate: boolean;
  startDate: string;
}

export interface UserProfile {
  id?: number;
  personal: PersonalInfo;
  work: WorkExperience[];
  education: Education[];
  skills: string[];
  certifications: string[];
  languages: Language[];
  preferences: Preferences;
  updatedAt: number;
}

// ---- Custom Responses (Q&A Cache) ----

export interface CustomResponse {
  id?: number;
  question: string;
  normalizedQuestion: string;
  answer: string;
  embedding: number[];
  source: 'manual' | 'llm-generated' | 'llm-edited';
  createdAt: number;
  updatedAt: number;
}

// ---- Form Field Detection ----

export interface FormField {
  element: HTMLElement;
  type: 'text' | 'email' | 'tel' | 'url' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'number' | 'date' | 'file';
  label: string;
  name: string;
  required: boolean;
}

export interface FieldMapping {
  profilePath: string;
  confidence: number;
}

export interface FillResult {
  total: number;
  filled: number;
  skipped: number;
  fields: {
    label: string;
    status: 'filled' | 'skipped';
    value?: string;
  }[];
}

export interface RunAutofillResult {
  result: FillResult;
  warnings: string[];
}

// ---- Stored Files ----

export type FilePurpose = 'resume' | 'cover-letter' | 'other';

export interface StoredFile {
  id?: number;
  name: string;
  mimeType: string;
  data: ArrayBuffer;
  purpose: FilePurpose;
  createdAt: number;
}

// ---- Form Adapter ----

export interface FormAdapter {
  name: string;
  getFields(): FormField[];
  fillField(field: FormField, value: string): void;
}

// ---- Messages (content script <-> background) ----

export type MessageType =
  | { type: 'RUN_AUTOFILL_ACTIVE_TAB' }
  | { type: 'RUN_AUTOFILL' }
  | { type: 'GET_PROFILE' }
  | { type: 'SAVE_PROFILE'; profile: UserProfile }
  | { type: 'GET_RESPONSE'; question: string }
  | {
      type: 'SAVE_RESPONSE';
      question: string;
      answer: string;
      source?: 'manual' | 'llm-generated' | 'llm-edited';
    }
  | {
      type: 'SAVE_RESPONSES_BATCH';
      responses: {
        question: string;
        answer: string;
        source: 'manual' | 'llm-generated' | 'llm-edited';
      }[];
    }
  | { type: 'FILL_FIELDS' }
  | { type: 'GET_API_KEY' }
  | { type: 'SAVE_API_KEY'; key: string }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: Settings }
  | { type: 'PARSE_RESUME'; text: string }
  | {
      type: 'GENERATE_FREE_TEXT_DRAFTS';
      prompts: FreeTextPromptInput[];
    }
  | { type: 'GET_FILE_FOR_PURPOSE'; purpose: FilePurpose }
  | { type: 'SAVE_FILE'; name: string; data: string; mimeType: string; purpose: FilePurpose }
  | { type: 'GET_FILES' }
  | { type: 'DELETE_FILE'; id: number };

// ---- Settings ----

export interface Settings {
  anthropicApiKey: string;
  openaiApiKey: string;
  primaryProvider: AIProvider;
  anthropicModel?: string;
  openaiModel?: string;
}

export type AIProvider = 'anthropic' | 'openai';

export interface AIModels {
  anthropic: string;
  openai: string;
}

export interface FreeTextPromptInput {
  fieldId: string;
  question: string;
  jobTitle?: string;
  company?: string;
  jobDescriptionSnippet?: string;
}

export interface FreeTextDraft {
  fieldId: string;
  question: string;
  answer: string;
  source:
    | 'cache-exact'
    | 'cache-semantic-reuse'
    | 'llm-generated'
    | 'llm-adapted';
  similarity?: number;
}

// ---- Helpers ----

export function createDefaultProfile(): UserProfile {
  return {
    personal: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      location: { city: '', state: '', country: '' },
      linkedIn: '',
      github: '',
      portfolio: '',
      website: '',
    },
    work: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
    preferences: {
      authorizedToWork: false,
      requiresSponsorship: false,
      salaryExpectation: '',
      willingToRelocate: false,
      startDate: '',
    },
    updatedAt: Date.now(),
  };
}

export function createDefaultSettings(): Settings {
  return {
    anthropicApiKey: '',
    openaiApiKey: '',
    primaryProvider: 'anthropic',
    anthropicModel: 'claude-sonnet-4-20250514',
    openaiModel: 'gpt-4.1-mini',
  };
}

export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ?!.,'-]/g, '')
    .trim();
}
