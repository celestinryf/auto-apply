import { normalizeQuestion } from '@/shared/types';

describe('normalizeQuestion', () => {
  it('lowercases and trims whitespace', () => {
    expect(normalizeQuestion('   Why   do you want this role?  ')).toBe(
      'why do you want this role?'
    );
  });

  it('removes unsupported symbols while keeping common punctuation', () => {
    expect(normalizeQuestion('C++/C# experience @ startup?!')).toBe(
      'cc experience  startup?!'
    );
  });

  it('returns empty string for blank input', () => {
    expect(normalizeQuestion('    ')).toBe('');
  });
});
