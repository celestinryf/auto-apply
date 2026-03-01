import type { Settings, UserProfile } from '@/shared/types';
import { createDefaultProfile } from '@/shared/types';
import { withProviderFallback, providerTextCompletion } from '@/background/ai/providers';
import { buildResumeParsePrompt } from '@/background/ai/prompts';

export async function parseResumeText(text: string, settings: Settings): Promise<UserProfile> {
  const prompt = buildResumeParsePrompt(text);
  const parsed = await withProviderFallback(
    { settings, taskName: 'resume parsing' },
    async (provider) => {
      const raw = await providerTextCompletion(provider, settings, prompt);
      try {
        return JSON.parse(extractJson(raw)) as Record<string, unknown>;
      } catch (error) {
        throw new Error(`Resume parser returned invalid JSON: ${String(error)}`);
      }
    }
  );

  const profile = createDefaultProfile();

  // Merge parsed data into profile, keeping defaults for missing fields
  if (parsed.personal) {
    const personal = asRecord(parsed.personal);
    if (personal) {
      Object.assign(profile.personal, {
        firstName: toStringValue(personal.firstName),
        lastName: toStringValue(personal.lastName),
        email: toStringValue(personal.email),
        phone: toStringValue(personal.phone),
        linkedIn: toStringValue(personal.linkedIn),
        github: toStringValue(personal.github),
        portfolio: toStringValue(personal.portfolio),
        website: toStringValue(personal.website),
      });

      const location = asRecord(personal.location);
      if (location) {
        Object.assign(profile.personal.location, {
          city: toStringValue(location.city),
          state: toStringValue(location.state),
          country: toStringValue(location.country),
        });
      }
    }
  }

  if (Array.isArray(parsed.work)) {
    profile.work = parsed.work.map((item, i: number) => {
      const w = asRecord(item);
      return {
      id: `work-${i}`,
      company: toStringValue(w?.company),
      title: toStringValue(w?.title),
      startDate: toStringValue(w?.startDate),
      endDate: toStringValue(w?.endDate),
      current: toBooleanValue(w?.current),
      description: toStringValue(w?.description),
      highlights: Array.isArray(w?.highlights)
        ? w.highlights.map((entry) => toStringValue(entry)).filter(Boolean)
        : [],
      };
    });
  }

  if (Array.isArray(parsed.education)) {
    profile.education = parsed.education.map((item, i: number) => {
      const e = asRecord(item);
      return {
      id: `edu-${i}`,
      school: toStringValue(e?.school),
      degree: toStringValue(e?.degree),
      field: toStringValue(e?.field),
      startDate: toStringValue(e?.startDate),
      endDate: toStringValue(e?.endDate),
      gpa: toStringValue(e?.gpa),
      };
    });
  }

  if (Array.isArray(parsed.skills)) {
    profile.skills = parsed.skills.map((skill) => toStringValue(skill)).filter(Boolean);
  }

  if (Array.isArray(parsed.certifications)) {
    profile.certifications = parsed.certifications
      .map((certification) => toStringValue(certification))
      .filter(Boolean);
  }

  if (Array.isArray(parsed.languages)) {
    profile.languages = parsed.languages.map((item) => {
      const l = asRecord(item);
      return {
        language: toStringValue(l?.language),
        proficiency: toStringValue(l?.proficiency),
      };
    });
  }

  return profile;
}

function extractJson(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model output.');
  }
  return text.slice(start, end + 1);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toBooleanValue(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false;
}
