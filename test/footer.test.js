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
  expect(footer.firstElementChild.textContent).toBe(`© ${year}`);
  expect(getComputedStyle(footer).display).not.toBe('none');
  expect(footer.hidden).toBe(false);
});

it('ends the footer with a Back to top anchor targeting the header', () => {
  const page = new DOMParser().parseFromString(html, 'text/html');
  const footer = page.querySelector('footer.site-footer');
  const link = footer.lastElementChild;
  expect(link.getAttribute('href')).toBe('#top');
  expect(link.textContent).toBe('Back to top ↑');
  expect(link.querySelector('span').getAttribute('aria-hidden')).toBe('true');
  expect(link.hasAttribute('aria-label')).toBe(false);
  const header = page.querySelector('header.site-header');
  expect(header.id).toBe('top');
  expect(header.getAttribute('tabindex')).toBe('-1');
});
