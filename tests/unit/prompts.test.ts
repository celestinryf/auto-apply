import { buildFreeTextPrompt, buildResumeParsePrompt } from '@/background/ai/prompts';
import { createDefaultProfile } from '@/shared/types';

describe('prompt builders', () => {
  it('builds resume parsing prompt with schema instructions and resume text', () => {
    const prompt = buildResumeParsePrompt('Ada Lovelace\nEngineer');

    expect(prompt).toContain('Return ONLY valid JSON matching this exact schema');
    expect(prompt).toContain('Resume text:');
    expect(prompt).toContain('Ada Lovelace');
  });

  it('builds free-text prompt with profile, context, question and similar answer', () => {
    const profile = createDefaultProfile();
    profile.personal.firstName = 'Ada';
    profile.personal.lastName = 'Lovelace';
    profile.personal.email = 'ada@example.com';
    profile.work = [
      {
        id: 'w1',
        company: 'Analytical Engines',
        title: 'Engineer',
        startDate: '1843-01',
        endDate: '',
        current: true,
        description: '',
        highlights: [],
      },
    ];
    profile.skills = ['TypeScript', 'Distributed Systems'];

    const prompt = buildFreeTextPrompt(
      profile,
      {
        fieldId: 'f1',
        question: 'Why are you interested in this role?',
        jobTitle: 'Senior Platform Engineer',
        company: 'Orbit Labs',
        jobDescriptionSnippet: 'Build resilient cloud systems.',
      },
      'I enjoy platform reliability work.'
    );

    expect(prompt).toContain('Applicant profile:');
    expect(prompt).toContain('Ada Lovelace');
    expect(prompt).toContain('Job title: Senior Platform Engineer');
    expect(prompt).toContain('Company: Orbit Labs');
    expect(prompt).toContain('Question:');
    expect(prompt).toContain('Why are you interested in this role?');
    expect(prompt).toContain('Closest prior answer you may adapt');
  });

  it('builds free-text prompt without optional context and similar answer', () => {
    const profile = createDefaultProfile();
    profile.personal.firstName = 'Grace';
    profile.personal.lastName = 'Hopper';

    const prompt = buildFreeTextPrompt(profile, {
      fieldId: 'f2',
      question: 'Tell us about a project you are proud of.',
    });

    expect(prompt).toContain('Grace Hopper');
    expect(prompt).toContain('Tell us about a project you are proud of.');
    expect(prompt).not.toContain('Closest prior answer you may adapt');
  });
});
