import { afterEach, expect, it, vi } from 'vitest';
import html from '../index.html?raw';

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  document.body.innerHTML = '';
});

it.each([2025, 2031])('shows © %i in the page footer using the current date', async (year) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(year, 5, 15));
  const page = new DOMParser().parseFromString(html, 'text/html');
  document.body.innerHTML = page.body.innerHTML;

  expect(page.querySelector('script[src="footer.js"]').type).toBe('module');
  await import('../footer.js');

  const footer = document.querySelector('body > footer');
  expect(footer.textContent).toBe(`© ${year}`);
  expect(getComputedStyle(footer).display).not.toBe('none');
  expect(footer.hidden).toBe(false);
});
