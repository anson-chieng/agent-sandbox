import { describe, expect, it } from 'vitest';
import html from '../index.html?raw';
import { readFileSync } from 'node:fs';

const labelCss = readFileSync('styles.css', 'utf8');

window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

async function load(theme, { dark = 'Dark', light = 'Light', stored = null } = {}) {
  document.documentElement.innerHTML = new DOMParser().parseFromString(html, 'text/html').documentElement.innerHTML;
  const style = document.createElement('style');
  style.textContent = labelCss;
  document.head.append(style);
  const label = document.getElementById('theme-label');
  label.setAttribute('data-label-dark', dark);
  label.setAttribute('data-label-light', light);
  localStorage.clear();
  if (stored) localStorage.setItem('theme', stored);
  const mq = { matches: theme === 'dark', addEventListener: (_, f) => (mq.fire = f), removeEventListener() {} };
  const { initThemeToggle } = await import('../theme.js');
  const ctl = initThemeToggle({ button: document.getElementById('theme-toggle'), label, matchMedia: () => mq });
  return { doc: document, mq, ctl };
}

describe('theme label', () => {
  it('is a static element immediately before the toggle, outside it, hidden from AT', async () => {
    const { doc } = await load('light');
    const label = doc.getElementById('theme-label');
    const button = doc.getElementById('theme-toggle');
    expect(label.nextElementSibling).toBe(button);
    expect(button.contains(label)).toBe(false);
    expect(label.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows the attribute value matching the theme, on load', async () => {
    const fr = { dark: 'Sombre', light: 'Clair' };
    expect((await load('dark', fr)).doc.getElementById('theme-label').textContent).toBe('Sombre');
    expect((await load('light', fr)).doc.getElementById('theme-label').textContent).toBe('Clair');
  });

  it('switches on toggle click and on OS change when nothing is saved', async () => {
    const { doc, mq } = await load('light', { dark: 'Sombre', light: 'Clair' });
    const label = doc.getElementById('theme-label');
    doc.getElementById('theme-toggle').click();
    expect(label.textContent).toBe('Sombre');
    doc.getElementById('theme-toggle').click();
    expect(label.textContent).toBe('Clair');
    localStorage.clear();
    mq.matches = true;
    mq.fire();
    expect(label.textContent).toBe('Sombre');
  });

  it('ships Dark / Light attributes', async () => {
    const label = (await load('light')).doc.getElementById('theme-label');
    expect(label.textContent).toBe('Light');
  });

  it('leaves the toggle accessible name and tooltip untouched', async () => {
    const button = (await load('light')).doc.getElementById('theme-toggle');
    expect(button.getAttribute('aria-label')).toBe('Dark mode');
    expect(button.getAttribute('title')).toBe('Switch to dark mode');
  });
});
