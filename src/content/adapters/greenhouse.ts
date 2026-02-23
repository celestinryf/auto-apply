import { BaseAdapter } from './base';
import type { FormField } from '@/shared/types';

export class GreenhouseAdapter extends BaseAdapter {
  name = 'Greenhouse';

  detect(): boolean {
    // Check URL patterns
    const url = window.location.href;
    if (url.includes('boards.greenhouse.io') || url.includes('greenhouse.io/')) {
      return true;
    }

    // Check for Greenhouse-specific DOM markers
    const metaTag = document.querySelector('meta[name="generator"][content*="Greenhouse"]');
    if (metaTag) return true;

    // Check for common Greenhouse form IDs/classes
    const appForm = document.querySelector('#application_form, #greenhouse_application');
    if (appForm) return true;

    return false;
  }

  getFields(): FormField[] {
    const fields: FormField[] = [];
    const form = this.findApplicationForm();
    if (!form) return fields;

    // Gather all input-like elements within the form
    const elements = form.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'
    );

    for (const el of elements) {
      // Skip invisible elements
      if (!el.offsetParent && el.getAttribute('type') !== 'hidden') continue;

      const label = this.getFieldLabel(el);
      const type = this.getFieldType(el);
      const name = el.getAttribute('name') ?? '';
      const required =
        el.hasAttribute('required') ||
        el.getAttribute('aria-required') === 'true' ||
        el.closest('.field')?.classList.contains('required') === true;

      fields.push({ element: el, type, label, name, required });
    }

    return fields;
  }

  private findApplicationForm(): HTMLElement | null {
    // Greenhouse uses various form containers
    const selectors = [
      '#application_form',
      '#greenhouse_application',
      'form[action*="greenhouse"]',
      '[data-controller="application"]',
      '.application-form',
      '#main_fields',
    ];

    for (const selector of selectors) {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) return el;
    }

    // Fallback: look for a form with application-like fields
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      if (
        form.querySelector('[name*="first_name"], [name*="last_name"], [name*="email"]')
      ) {
        return form;
      }
    }

    return null;
  }
}
