import { afterEach, beforeEach, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repo = resolve(__dirname, '..');
const files = ['index.html', 'styles.css', 'theme.js', 'footer.js'];
let root;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'build-'));
  cpSync(join(repo, 'build.js'), join(root, 'build.js'));
  for (const f of files) cpSync(join(repo, f), join(root, f));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const build = (epoch, extra = {}) =>
  spawnSync('node', ['build.js'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...extra, ...(epoch === undefined ? {} : { SOURCE_DATE_EPOCH: epoch }) },
  });
const built = () => new DOMParser().parseFromString(readFileSync(join(root, 'dist/index.html'), 'utf8'), 'text/html');

it('source span is hidden and sits between © and Back to top', () => {
  const src = new DOMParser().parseFromString(readFileSync(join(repo, 'index.html'), 'utf8'), 'text/html');
  const kids = [...src.querySelector('footer.site-footer').children];
  expect(kids[1].matches('span.last-updated[hidden]')).toBe(true);
  expect(kids).toHaveLength(3);
});

it('produces dist with exactly the allowlist, recreated from scratch', () => {
  expect(build('1792152000').status).toBe(0);
  writeFileSync(join(root, 'dist/stale.txt'), 'x');
  const before = readFileSync(join(root, 'index.html'), 'utf8');
  expect(build('1792152000').status).toBe(0);
  expect(readdirSync(join(root, 'dist')).sort()).toEqual([...files].sort());
  expect(readFileSync(join(root, 'index.html'), 'utf8')).toBe(before);
});

it('stamps the UTC date, visible and in datetime', () => {
  build('1792152000'); // 2026-10-16T12:00Z
  const footer = built().querySelector('footer.site-footer');
  const span = footer.querySelector('span.last-updated');
  expect(span.hidden).toBe(false);
  expect(span.textContent).toBe('Last updated 16 October 2026');
  expect(span.querySelector('time').getAttribute('datetime')).toBe('2026-10-16');
  expect(footer.children[1]).toBe(span);
  expect(footer.firstElementChild.textContent).toContain('©');
  expect(footer.lastElementChild.getAttribute('href')).toBe('#top');
});

it('different epochs give different dates', () => {
  build('1792152000');
  const a = built().querySelector('.last-updated').textContent;
  build('1792238400');
  expect(built().querySelector('.last-updated').textContent).not.toBe(a);
});

it.each(['Pacific/Kiritimati', 'Pacific/Pago_Pago'])('uses UTC just before midnight in %s', (TZ) => {
  build('1792195199', { TZ }); // 2026-10-16T23:59:59Z
  expect(built().querySelector('time').getAttribute('datetime')).toBe('2026-10-16');
});

it.each(['abc', '1.5', '', '12x'])('fails on invalid SOURCE_DATE_EPOCH %j', (v) => {
  const r = build(v);
  expect(r.status).not.toBe(0);
});

it.each([0, 2])('fails when source has %i span.last-updated', (n) => {
  const span = '<span class="last-updated" hidden>Last updated <time datetime=""></time></span>';
  let html = readFileSync(join(root, 'index.html'), 'utf8').replace(span, n ? span + span : '');
  writeFileSync(join(root, 'index.html'), html);
  expect(build('1792152000').status).not.toBe(0);
});

it('built page has no date-computing script', () => {
  build('1792152000');
  const html = readFileSync(join(root, 'dist/index.html'), 'utf8');
  expect(html).not.toMatch(/lastModified/);
});
