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
  answer: string;
  createdAt: number;
  updatedAt: number;
}

// ---- Form Field Detection ----

export interface FormField {
  element: HTMLElement;
  type: 'text' | 'email' | 'tel' | 'url' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'number' | 'date';
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

// ---- ATS Adapter ----

export interface ATSAdapter {
  name: string;
  detect(): boolean;
  getFields(): FormField[];
  fillField(field: FormField, value: string): void;
}

// ---- Messages (content script <-> background) ----

export type MessageType =
  | { type: 'GET_PROFILE' }
  | { type: 'SAVE_PROFILE'; profile: UserProfile }
  | { type: 'GET_RESPONSE'; question: string }
  | { type: 'SAVE_RESPONSE'; question: string; answer: string }
  | { type: 'FILL_FIELDS' }
  | { type: 'GET_API_KEY' }
  | { type: 'SAVE_API_KEY'; key: string }
  | { type: 'PARSE_RESUME'; text: string };

// ---- Settings ----

export interface Settings {
  apiKey: string;
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
