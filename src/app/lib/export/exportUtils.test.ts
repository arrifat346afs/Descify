import { describe, it, expect, vi } from 'vitest';

// The module imports Tauri plugins at load time; the tests
// only exercise the pure CSV escaping logic.
vi.mock('@tauri-apps/plugin-fs', () => ({ writeTextFile: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn() }));

import { escapeCSVField } from './exportUtils';

describe('escapeCSVField', () => {
  it('leaves plain fields untouched', () => {
    expect(escapeCSVField('Sunset')).toBe('Sunset');
  });

  it('quotes fields containing commas', () => {
    expect(escapeCSVField('sky, sea')).toBe('"sky, sea"');
  });

  it('escapes internal double quotes', () => {
    expect(escapeCSVField('say "hi"')).toBe('"say ""hi"""');
  });

  it('quotes fields containing newlines', () => {
    expect(escapeCSVField('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCSVField('a\rb')).toBe('"a\rb"');
  });

  it('returns empty for empty input', () => {
    expect(escapeCSVField('')).toBe('');
  });
});
