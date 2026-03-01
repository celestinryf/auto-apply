import { BaseAdapter } from './base';
import type { FormField } from '@/shared/types';

const MAX_DEPTH = 5;
const MAX_ELEMENTS = 10_000;

export class GenericFormAdapter extends BaseAdapter {
  name = 'Generic Form';

  getFields(): FormField[] {
    const fields: FormField[] = [];
    const counter = { count: 0 };
    this.collectFieldsFromRoot(document, fields, 0, counter);
    return fields;
  }

  private collectFieldsFromRoot(
    root: Document | ShadowRoot,
    fields: FormField[],
    depth: number,
    counter: { count: number }
  ): void {
    if (depth > MAX_DEPTH || counter.count >= MAX_ELEMENTS) return;

    const selector =
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea';
    const formElements = root.querySelectorAll<HTMLElement>(selector);

    for (const el of formElements) {
      if (counter.count >= MAX_ELEMENTS) return;
      counter.count++;

      if (!this.isFillableElement(el)) continue;

      const label = this.getFieldLabel(el);
      const type = this.getFieldType(el);
      const name = el.getAttribute('name') ?? el.id ?? '';
      const required =
        el.hasAttribute('required') ||
        el.getAttribute('aria-required') === 'true';

      fields.push({ element: el, type, label, name, required });
    }

    // Traverse shadow DOMs using TreeWalker
    this.collectFieldsFromShadowRoots(root, fields, depth, counter);

    // Traverse same-origin iframes (only from Document roots)
    if (root instanceof Document) {
      this.collectFieldsFromIframes(root, fields, depth, counter);
    }
  }

  private collectFieldsFromShadowRoots(
    root: Document | ShadowRoot,
    fields: FormField[],
    depth: number,
    counter: { count: number }
  ): void {
    if (depth >= MAX_DEPTH || counter.count >= MAX_ELEMENTS) return;

    const walker = document.createTreeWalker(
      root instanceof Document ? root.body ?? root.documentElement : root,
      NodeFilter.SHOW_ELEMENT
    );

    let node = walker.nextNode();
    while (node) {
      if (counter.count >= MAX_ELEMENTS) return;
      counter.count++;

      const element = node as Element;
      if (element.shadowRoot) {
        this.collectFieldsFromRoot(element.shadowRoot, fields, depth + 1, counter);
      }

      node = walker.nextNode();
    }
  }

  private collectFieldsFromIframes(
    doc: Document,
    fields: FormField[],
    depth: number,
    counter: { count: number }
  ): void {
    if (depth >= MAX_DEPTH || counter.count >= MAX_ELEMENTS) return;

    const iframes = doc.querySelectorAll('iframe');
    for (const iframe of iframes) {
      if (counter.count >= MAX_ELEMENTS) return;

      try {
        const iframeDoc = iframe.contentDocument;
        if (iframeDoc) {
          this.collectFieldsFromRoot(iframeDoc, fields, depth + 1, counter);
        }
      } catch {
        // Cross-origin iframe — silently skip
      }
    }
  }

  private isFillableElement(el: HTMLElement): boolean {
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement
    ) {
      if (el.disabled || el.readOnly) return false;
    }

    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return true;
  }
}
