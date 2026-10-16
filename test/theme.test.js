import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyTheme,
  initThemeToggle,
  readStoredTheme,
  resolveInitialTheme,
  writeStoredTheme,
} from '../theme.js';

function makeMatchMedia(initialDark) {
  let dark = initialDark;
  const listeners = new Set();
  const mql = {
    get matches() {
      return dark;
    },
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
  };
  const matchMedia = () => mql;
  matchMedia.setDark = (value) => {
    dark = value;
    listeners.forEach((fn) => fn({ matches: value }));
  };
  return matchMedia;
}

function makeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    data,
  };
}

const throwingStorage = (which) => ({
  getItem: () => {
    if (which.includes('read')) throw new Error('blocked');
    return null;
  },
  setItem: () => {
    if (which.includes('write')) throw new Error('blocked');
  },
});

let button;
let root;

beforeEach(() => {
  document.body.innerHTML = '<button id="theme-toggle" type="button"></button>';
  button = document.getElementById('theme-toggle');
  root = document.documentElement;
  root.removeAttribute('data-theme');
  root.style.removeProperty('color-scheme');
});

const init = (storage, matchMedia) => initThemeToggle({ button, root, storage, matchMedia });

describe('initial theme', () => {
  it('stored dark wins over OS light', () => {
    expect(resolveInitialTheme(makeStorage({ theme: 'dark' }), makeMatchMedia(false))).toBe('dark');
  });

  it('stored light wins over OS dark', () => {
    expect(resolveInitialTheme(makeStorage({ theme: 'light' }), makeMatchMedia(true))).toBe('light');
  });

  it('follows OS when nothing is stored', () => {
    expect(resolveInitialTheme(makeStorage(), makeMatchMedia(true))).toBe('dark');
    expect(resolveInitialTheme(makeStorage(), makeMatchMedia(false))).toBe('light');
  });

  it('ignores invalid stored values', () => {
    expect(readStoredTheme(makeStorage({ theme: 'purple' }))).toBeNull();
  });

  it('falls back to OS theme when storage throws on read', () => {
    const storage = throwingStorage(['read']);
    expect(() => resolveInitialTheme(storage, makeMatchMedia(true))).not.toThrow();
    expect(resolveInitialTheme(storage, makeMatchMedia(true))).toBe('dark');
  });
});

describe('toggle', () => {
  it('flips the theme and updates data-theme, color-scheme and aria-pressed', () => {
    init(makeStorage(), makeMatchMedia(false));
    expect(root.getAttribute('data-theme')).toBe('light');
    expect(button.getAttribute('aria-pressed')).toBe('false');

    button.click();
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(root.style.getPropertyValue('color-scheme')).toBe('dark');
    expect(button.getAttribute('aria-pressed')).toBe('true');

    button.click();
    expect(root.getAttribute('data-theme')).toBe('light');
    expect(root.style.getPropertyValue('color-scheme')).toBe('light');
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('writes the new theme to localStorage["theme"]', () => {
    const storage = makeStorage();
    init(storage, makeMatchMedia(false));
    button.click();
    expect(storage.data.theme).toBe('dark');
  });

  it('still switches in-page when storage throws on write', () => {
    init(throwingStorage(['write']), makeMatchMedia(false));
    expect(() => button.click()).not.toThrow();
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(writeStoredTheme(throwingStorage(['write']), 'dark')).toBe(false);
  });

  it('updates the button title to describe the action', () => {
    applyTheme('light', root, button);
    expect(button.title).toBe('Switch to dark mode');
    applyTheme('dark', root, button);
    expect(button.title).toBe('Switch to light mode');
  });
});

describe('OS preference changes', () => {
  it('update the theme when nothing is stored', () => {
    const mm = makeMatchMedia(false);
    init(makeStorage(), mm);
    mm.setDark(true);
    expect(root.getAttribute('data-theme')).toBe('dark');
    mm.setDark(false);
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  it('do not change the theme when a choice is stored', () => {
    const mm = makeMatchMedia(false);
    init(makeStorage({ theme: 'light' }), mm);
    mm.setDark(true);
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  it('do not override a click whose write failed', () => {
    const mm = makeMatchMedia(false);
    init(throwingStorage(['write']), mm);
    button.click();
    mm.setDark(false);
    expect(root.getAttribute('data-theme')).toBe('dark');
  });
});
