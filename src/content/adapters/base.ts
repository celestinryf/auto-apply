import type { FormAdapter, FormField } from '@/shared/types';

export abstract class BaseAdapter implements FormAdapter {
  abstract name: string;

  abstract getFields(): FormField[];

  fillField(field: FormField, value: string): void {
    const el = field.element;

    if (el instanceof HTMLSelectElement) {
      this.fillSelect(el, value);
    } else if (el instanceof HTMLInputElement) {
      if (field.type === 'checkbox') {
        this.fillCheckbox(el, value);
      } else if (field.type === 'radio') {
        this.fillRadio(el, value);
      } else {
        this.fillInput(el, value);
      }
    } else if (el instanceof HTMLTextAreaElement) {
      this.fillInput(el, value);
    }
  }

  protected fillInput(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    // Use native setter to bypass React/Angular controlled component logic
    const nativeInputValueSetter =
      Object.getOwnPropertyDescriptor(
        el instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype,
        'value'
      )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, value);
    } else {
      el.value = value;
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  protected fillSelect(el: HTMLSelectElement, value: string): void {
    const normalizedValue = value.toLowerCase().trim();
    let bestMatch: HTMLOptionElement | null = null;
    let bestScore = 0;

    for (const option of Array.from(el.options)) {
      const optionText = option.textContent?.toLowerCase().trim() ?? '';
      const optionValue = option.value.toLowerCase().trim();

      // Exact match on text or value
      if (optionText === normalizedValue || optionValue === normalizedValue) {
        bestMatch = option;
        bestScore = 1;
        break;
      }

      // Partial match — option contains value or value contains option
      if (optionText.includes(normalizedValue) || normalizedValue.includes(optionText)) {
        const score = normalizedValue.length / Math.max(optionText.length, 1);
        if (score > bestScore) {
          bestMatch = option;
          bestScore = score;
        }
      }
    }

    if (bestMatch && bestScore > 0.3) {
      el.value = bestMatch.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }
  }

  protected fillCheckbox(el: HTMLInputElement, value: string): void {
    const shouldCheck =
      value === 'true' || value === 'yes' || value === '1' || value === 'on';
    if (el.checked !== shouldCheck) {
      el.click();
    }
  }

  protected fillRadio(el: HTMLInputElement, value: string): void {
    const normalizedValue = value.toLowerCase().trim();
    const radioValue = el.value.toLowerCase().trim();
    const labelText =
      el.labels?.[0]?.textContent?.toLowerCase().trim() ?? '';

    if (
      radioValue === normalizedValue ||
      labelText === normalizedValue ||
      labelText.includes(normalizedValue)
    ) {
      el.click();
    }
  }

  protected getFieldLabel(el: HTMLElement): string {
    // 1. Check for associated <label>
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      if (el.labels && el.labels.length > 0) {
        return el.labels[0].textContent?.trim() ?? '';
      }
    }

    // 2. Check aria-label
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();

    // 3. Check aria-labelledby (resolve within shadow root or document)
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const root = el.getRootNode() as Document | ShadowRoot;
      const escaped = CSS.escape(labelledBy);
      const labelEl =
        root.querySelector?.(`#${escaped}`) ?? document.getElementById(labelledBy);
      if (labelEl) return labelEl.textContent?.trim() ?? '';
    }

    // 4. Check placeholder
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      if (el.placeholder) return el.placeholder.trim();
    }

    // 5. Check name attribute as fallback
    const name = el.getAttribute('name');
    if (name) return name.replace(/[_\-[\]]/g, ' ').trim();

    return '';
  }

  protected getFieldType(el: HTMLElement): FormField['type'] {
    if (el instanceof HTMLSelectElement) return 'select';
    if (el instanceof HTMLTextAreaElement) return 'textarea';
    if (el instanceof HTMLInputElement) {
      const inputType = el.type.toLowerCase();
      switch (inputType) {
        case 'email': return 'email';
        case 'tel': return 'tel';
        case 'url': return 'url';
        case 'number': return 'number';
        case 'date': return 'date';
        case 'checkbox': return 'checkbox';
        case 'radio': return 'radio';
        case 'file': return 'file';
        default: return 'text';
      }
    }
    return 'text';
  }
}
