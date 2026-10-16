import { mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');
const files = ['index.html', 'styles.css', 'theme.js', 'footer.js'];

function buildDate() {
  const raw = process.env.SOURCE_DATE_EPOCH;
  if (raw === undefined) return new Date();
  if (!/^-?\d+$/.test(raw)) throw new Error(`Invalid SOURCE_DATE_EPOCH: ${JSON.stringify(raw)}`);
  const date = new Date(Number(raw) * 1000);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid SOURCE_DATE_EPOCH: ${JSON.stringify(raw)}`);
  return date;
}

function stamp(html, date) {
  const re = /<span\b[^>]*\bclass="last-updated"[^>]*>[\s\S]*?<\/span>/g;
  const matches = html.match(re) ?? [];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one span.last-updated in index.html, found ${matches.length}`);
  }
  const text = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
  const iso = date.toISOString().slice(0, 10);
  return html.replace(
    re,
    `<span class="last-updated">Last updated <time datetime="${iso}">${text}</time></span>`,
  );
}

try {
  const date = buildDate();
  const stamped = stamp(readFileSync(join(root, 'index.html'), 'utf8'), date);
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist);
  for (const f of files) copyFileSync(join(root, f), join(dist, f));
  writeFileSync(join(dist, 'index.html'), stamped);
} catch (err) {
  console.error(`build failed: ${err.message}`);
  process.exit(1);
}
