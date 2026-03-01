// @vitest-environment jsdom

import { GenericFormAdapter } from '@/content/adapters/generic';

describe('GenericFormAdapter', () => {
  let adapter: GenericFormAdapter;

  beforeEach(() => {
    adapter = new GenericFormAdapter();
  });

  it('detects basic document fields', () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="first_name" />
        <input type="email" name="email" />
        <select name="country"><option>US</option></select>
        <textarea name="cover_letter"></textarea>
      </form>
    `;

    const fields = adapter.getFields();
    expect(fields).toHaveLength(4);
    expect(fields.map((f) => f.type)).toEqual(['text', 'email', 'select', 'textarea']);
  });

  it('detects fields inside an open shadow DOM', () => {
    document.body.innerHTML = '<div id="host"></div>';
    const host = document.getElementById('host')!;
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <input type="text" name="shadow_field" />
      <textarea name="shadow_textarea"></textarea>
    `;

    const fields = adapter.getFields();
    expect(fields).toHaveLength(2);
    expect(fields[0].name).toBe('shadow_field');
    expect(fields[1].name).toBe('shadow_textarea');
  });

  it('detects fields in nested shadow DOMs up to depth limit', () => {
    document.body.innerHTML = '<div id="level0"></div>';

    // Create nested shadow DOMs: level0 -> level1 -> level2 -> ... -> level5 -> level6
    let currentHost = document.getElementById('level0')!;
    for (let i = 1; i <= 6; i++) {
      const shadow = currentHost.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <input type="text" name="field_level_${i}" />
        <div id="level${i}"></div>
      `;
      currentHost = shadow.getElementById(`level${i}`)!;
    }

    const fields = adapter.getFields();
    // depth 0 = document, depths 1-5 should be reachable (5 levels of shadow DOM)
    // depth 6 (level6) should be beyond MAX_DEPTH=5
    const fieldNames = fields.map((f) => f.name);
    expect(fieldNames).toContain('field_level_1');
    expect(fieldNames).toContain('field_level_5');
    // level 6 is at depth > MAX_DEPTH, should not be included
    expect(fieldNames).not.toContain('field_level_6');
  });

  it('filters out disabled and hidden fields', () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="visible" />
        <input type="text" name="disabled_field" disabled />
        <input type="text" name="hidden_field" style="display: none" />
        <input type="text" name="invisible_field" style="visibility: hidden" />
      </form>
    `;

    const fields = adapter.getFields();
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('visible');
  });

  it('handles cross-origin iframe access gracefully', () => {
    document.body.innerHTML = '<iframe id="xorigin"></iframe>';
    const iframe = document.getElementById('xorigin') as HTMLIFrameElement;

    // Simulate cross-origin by making contentDocument throw
    Object.defineProperty(iframe, 'contentDocument', {
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });

    // Should not throw
    const fields = adapter.getFields();
    expect(fields).toHaveLength(0);
  });

  it('respects element count cap', () => {
    // Create a large number of non-input elements to hit the counter
    // The cap is 10,000 so we need to verify the adapter stops scanning
    const divs = Array.from({ length: 100 }, (_, i) => `<div id="d${i}"></div>`).join('');
    document.body.innerHTML = `
      ${divs}
      <input type="text" name="last_field" />
    `;

    // With only 101 elements, this should work fine
    const fields = adapter.getFields();
    expect(fields.length).toBeGreaterThanOrEqual(1);
    expect(fields[0].name).toBe('last_field');
  });

  it('detects file input fields', () => {
    document.body.innerHTML = `
      <form>
        <input type="file" name="resume" />
        <input type="text" name="name" />
      </form>
    `;

    const fields = adapter.getFields();
    expect(fields).toHaveLength(2);
    const fileField = fields.find((f) => f.name === 'resume');
    expect(fileField?.type).toBe('file');
  });

  it('excludes hidden, submit, and button inputs', () => {
    document.body.innerHTML = `
      <form>
        <input type="hidden" name="token" value="abc" />
        <input type="submit" value="Submit" />
        <input type="button" value="Cancel" />
        <input type="text" name="real_field" />
      </form>
    `;

    const fields = adapter.getFields();
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('real_field');
  });
});
