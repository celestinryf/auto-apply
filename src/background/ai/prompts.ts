import type { FreeTextPromptInput, UserProfile } from '@/shared/types';

export function buildResumeParsePrompt(text: string): string {
  return `Parse the following resume text into a structured JSON object.
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
${text}`;
}

function profileSummary(profile: UserProfile): string {
  const location = [
    profile.personal.location.city,
    profile.personal.location.state,
    profile.personal.location.country,
  ]
    .filter(Boolean)
    .join(', ');
  const latestWork = profile.work[0];

  return [
    `Name: ${profile.personal.firstName} ${profile.personal.lastName}`.trim(),
    `Email: ${profile.personal.email}`,
    `Location: ${location}`,
    latestWork ? `Current/Latest role: ${latestWork.title} at ${latestWork.company}` : '',
    profile.skills.length > 0 ? `Skills: ${profile.skills.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildFreeTextPrompt(
  profile: UserProfile,
  input: FreeTextPromptInput,
  similarAnswer?: string
): string {
  const contextLines = [
    input.jobTitle ? `Job title: ${input.jobTitle}` : '',
    input.company ? `Company: ${input.company}` : '',
    input.jobDescriptionSnippet
      ? `Job description snippet: ${input.jobDescriptionSnippet}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  return `Write a concise, natural job application answer in first person.
Rules:
- Do not fabricate facts.
- Keep tone professional and direct.
- Use plain text only.
- If context is missing, keep answer general and truthful.

Applicant profile:
${profileSummary(profile)}

${contextLines}

Question:
${input.question}

${similarAnswer ? `Closest prior answer you may adapt:\n${similarAnswer}` : ''}

Return only the answer text.`;
}
