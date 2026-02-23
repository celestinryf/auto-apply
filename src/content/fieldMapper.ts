import type { FormField, UserProfile, FieldMapping } from '@/shared/types';

interface MappingRule {
  patterns: RegExp[];
  profilePath: string;
}

const MAPPING_RULES: MappingRule[] = [
  // Personal info
  {
    patterns: [/first\s*name/i, /given\s*name/i, /fname/i],
    profilePath: 'personal.firstName',
  },
  {
    patterns: [/last\s*name/i, /surname/i, /family\s*name/i, /lname/i],
    profilePath: 'personal.lastName',
  },
  {
    patterns: [/^email/i, /e-mail/i, /email\s*address/i],
    profilePath: 'personal.email',
  },
  {
    patterns: [/phone/i, /mobile/i, /telephone/i, /cell/i, /tel\b/i],
    profilePath: 'personal.phone',
  },

  // Location
  {
    patterns: [/\bcity\b/i],
    profilePath: 'personal.location.city',
  },
  {
    patterns: [/\bstate\b/i, /province/i, /region/i],
    profilePath: 'personal.location.state',
  },
  {
    patterns: [/\bcountry\b/i],
    profilePath: 'personal.location.country',
  },

  // Links
  {
    patterns: [/linkedin/i],
    profilePath: 'personal.linkedIn',
  },
  {
    patterns: [/github/i],
    profilePath: 'personal.github',
  },
  {
    patterns: [/portfolio/i],
    profilePath: 'personal.portfolio',
  },
  {
    patterns: [/website/i, /personal\s*site/i, /web\s*page/i],
    profilePath: 'personal.website',
  },

  // Preferences
  {
    patterns: [/authorized\s*to\s*work/i, /legally\s*authorized/i, /work\s*authorization/i, /eligible\s*to\s*work/i],
    profilePath: 'preferences.authorizedToWork',
  },
  {
    patterns: [/sponsorship/i, /visa\s*sponsor/i, /require.*sponsor/i],
    profilePath: 'preferences.requiresSponsorship',
  },
  {
    patterns: [/salary/i, /compensation/i, /pay\s*expectation/i, /desired\s*pay/i],
    profilePath: 'preferences.salaryExpectation',
  },
  {
    patterns: [/relocat/i, /willing\s*to\s*move/i],
    profilePath: 'preferences.willingToRelocate',
  },
  {
    patterns: [/start\s*date/i, /available\s*to\s*start/i, /earliest\s*start/i, /date\s*available/i],
    profilePath: 'preferences.startDate',
  },
];

export function mapFieldToProfile(field: FormField): FieldMapping | null {
  const label = field.label.toLowerCase();
  const name = field.name.toLowerCase();

  for (const rule of MAPPING_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(label) || pattern.test(name)) {
        return {
          profilePath: rule.profilePath,
          confidence: pattern.test(label) ? 0.9 : 0.7,
        };
      }
    }
  }

  return null;
}

export function getProfileValue(profile: UserProfile, path: string): string {
  const parts = path.split('.');
  let current: unknown = profile;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') return '';
    current = (current as Record<string, unknown>)[part];
  }

  if (typeof current === 'boolean') {
    return current ? 'Yes' : 'No';
  }

  return String(current ?? '');
}
