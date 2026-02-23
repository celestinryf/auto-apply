import Anthropic from '@anthropic-ai/sdk';
import type { UserProfile } from '@/shared/types';
import { createDefaultProfile } from '@/shared/types';

const PARSE_PROMPT = `Parse the following resume text into a structured JSON object.
Only include information explicitly present in the resume. Do not invent or assume anything.
If a field is not present, leave it as an empty string or empty array.

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):

{
  "personal": {
    "firstName": "",
    "lastName": "",
    "email": "",
    "phone": "",
    "location": { "city": "", "state": "", "country": "" },
    "linkedIn": "",
    "github": "",
    "portfolio": "",
    "website": ""
  },
  "work": [
    {
      "company": "",
      "title": "",
      "startDate": "",
      "endDate": "",
      "current": false,
      "description": "",
      "highlights": []
    }
  ],
  "education": [
    {
      "school": "",
      "degree": "",
      "field": "",
      "startDate": "",
      "endDate": "",
      "gpa": ""
    }
  ],
  "skills": [],
  "certifications": [],
  "languages": [{ "language": "", "proficiency": "" }]
}

Resume text:
`;

export async function parseResumeText(
  text: string,
  apiKey: string
): Promise<UserProfile> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: PARSE_PROMPT + text,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response format from API');
  }

  const parsed = JSON.parse(content.text);
  const profile = createDefaultProfile();

  // Merge parsed data into profile, keeping defaults for missing fields
  if (parsed.personal) {
    Object.assign(profile.personal, parsed.personal);
    if (parsed.personal.location) {
      Object.assign(profile.personal.location, parsed.personal.location);
    }
  }

  if (Array.isArray(parsed.work)) {
    profile.work = parsed.work.map((w: Record<string, unknown>, i: number) => ({
      id: `work-${i}`,
      company: w.company ?? '',
      title: w.title ?? '',
      startDate: w.startDate ?? '',
      endDate: w.endDate ?? '',
      current: w.current ?? false,
      description: w.description ?? '',
      highlights: Array.isArray(w.highlights) ? w.highlights : [],
    }));
  }

  if (Array.isArray(parsed.education)) {
    profile.education = parsed.education.map((e: Record<string, unknown>, i: number) => ({
      id: `edu-${i}`,
      school: e.school ?? '',
      degree: e.degree ?? '',
      field: e.field ?? '',
      startDate: e.startDate ?? '',
      endDate: e.endDate ?? '',
      gpa: e.gpa ?? '',
    }));
  }

  if (Array.isArray(parsed.skills)) {
    profile.skills = parsed.skills;
  }

  if (Array.isArray(parsed.certifications)) {
    profile.certifications = parsed.certifications;
  }

  if (Array.isArray(parsed.languages)) {
    profile.languages = parsed.languages.map((l: Record<string, unknown>) => ({
      language: l.language ?? '',
      proficiency: l.proficiency ?? '',
    }));
  }

  return profile;
}
