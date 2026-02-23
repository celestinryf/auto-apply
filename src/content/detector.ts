import type { ATSAdapter } from '@/shared/types';
import { GreenhouseAdapter } from './adapters/greenhouse';

const adapters: ATSAdapter[] = [
  new GreenhouseAdapter(),
];

export function detectATS(): ATSAdapter | null {
  for (const adapter of adapters) {
    if (adapter.detect()) {
      console.log(`[Auto Apply] Detected ATS: ${adapter.name}`);
      return adapter;
    }
  }
  return null;
}

export function registerAdapter(adapter: ATSAdapter): void {
  adapters.push(adapter);
}
