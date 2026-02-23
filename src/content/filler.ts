import type { ATSAdapter, UserProfile, FillResult } from '@/shared/types';
import { mapFieldToProfile, getProfileValue } from './fieldMapper';

export function fillForm(adapter: ATSAdapter, profile: UserProfile): FillResult {
  const fields = adapter.getFields();
  const result: FillResult = {
    total: fields.length,
    filled: 0,
    skipped: 0,
    fields: [],
  };

  for (const field of fields) {
    const mapping = mapFieldToProfile(field);

    if (!mapping) {
      result.skipped++;
      result.fields.push({ label: field.label, status: 'skipped' });
      continue;
    }

    const value = getProfileValue(profile, mapping.profilePath);

    if (!value) {
      result.skipped++;
      result.fields.push({ label: field.label, status: 'skipped' });
      continue;
    }

    try {
      adapter.fillField(field, value);
      result.filled++;
      result.fields.push({ label: field.label, status: 'filled', value });
    } catch (err) {
      console.warn(`[Auto Apply] Failed to fill field "${field.label}":`, err);
      result.skipped++;
      result.fields.push({ label: field.label, status: 'skipped' });
    }
  }

  console.log(`[Auto Apply] Fill complete: ${result.filled}/${result.total} fields filled`);
  return result;
}
