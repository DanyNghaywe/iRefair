import { describe, expect, it } from 'vitest';

import { escapeHtml, normalizeHttpUrl } from '../validation';

describe('normalizeHttpUrl', () => {
  it('returns null for empty input', () => {
    expect(normalizeHttpUrl('')).toBeNull();
    expect(normalizeHttpUrl('   ')).toBeNull();
  });

  it('adds https for bare hostnames', () => {
    expect(normalizeHttpUrl('example.com')).toBe('https://example.com/');
  });

  it('keeps http and https urls', () => {
    expect(normalizeHttpUrl('http://example.com')).toBe('http://example.com/');
    expect(normalizeHttpUrl('https://example.com/path?x=1')).toBe('https://example.com/path?x=1');
  });

  it('rejects non-http schemes', () => {
    expect(normalizeHttpUrl('ftp://example.com')).toBeNull();
    expect(normalizeHttpUrl('mailto:test@example.com')).toBeNull();
  });

  it('rejects invalid urls', () => {
    expect(normalizeHttpUrl('http://exa mple.com')).toBeNull();
  });
});

describe('escapeHtml', () => {
  it('escapes HTML special chars', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('leaves normal text unchanged', () => {
    expect(escapeHtml('hello')).toBe('hello');
  });
});
