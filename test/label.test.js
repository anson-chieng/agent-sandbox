import { describe, expect, it } from 'vitest';
import html from '../index.html?raw';
import { readFileSync } from 'node:fs';

const labelCss = readFileSync('styles.css', 'utf8');

function load(theme) {
  document.documentElement.innerHTML = new DOMParser().parseFromString(html, 'text/html').documentElement.innerHTML;
  const style = document.createElement('style');
  style.textContent = labelCss;
  document.head.append(style);
  document.documentElement.setAttribute('data-theme', theme);
  return document;
}

// Text of the label as a sighted user sees it (hidden descendants excluded).
function visibleLabel(doc) {
  const label = doc.getElementById('theme-label');
  return [...label.children]
    .filter((el) => getComputedStyle(el).display !== 'none')
    .map((el) => el.textContent.trim())
    .join(' ');
}

describe('theme label', () => {
  it('is a static element immediately before the toggle, outside it, hidden from AT', () => {
    const doc = load('light');
    const label = doc.getElementById('theme-label');
    const button = doc.getElementById('theme-toggle');
    expect(label.nextElementSibling).toBe(button);
    expect(button.contains(label)).toBe(false);
    expect(label.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows Light on a light page and Dark on a dark page, from CSS alone', () => {
    expect(visibleLabel(load('light'))).toBe('Light');
    expect(visibleLabel(load('dark'))).toBe('Dark');
  });

  it('leaves the toggle accessible name and tooltip untouched', () => {
    const button = load('light').getElementById('theme-toggle');
    expect(button.getAttribute('aria-label')).toBe('Dark mode');
    expect(button.getAttribute('title')).toBe('Switch to dark mode');
  });
});
