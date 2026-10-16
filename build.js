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

function findPlaceholders(html) {
  // Blank out comments (keeping offsets) so commented-out markup is ignored.
  const masked = html.replace(/<!--[\s\S]*?-->/g, (c) => ' '.repeat(c.length));
  const found = [];
  for (const m of masked.matchAll(/<span\b((?:"[^"]*"|'[^']*'|[^>"'])*)>/gi)) {
    const cls = m[1].match(/(?:^|\s)class\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i);
    const tokens = (cls ? (cls[1] ?? cls[2] ?? cls[3]) : '').split(/\s+/);
    if (!tokens.includes('last-updated')) continue;
    const end = masked.indexOf('</span>', m.index);
    if (end !== -1) found.push([m.index, end + '</span>'.length]);
    else found.push(null);
  }
  return found;
}

function stamp(html, date) {
  const found = findPlaceholders(html);
  if (found.length !== 1 || !found[0]) {
    throw new Error(`Expected exactly one span.last-updated in index.html, found ${found.length}`);
  }
  const [start, end] = found[0];
  const text = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
  const iso = date.toISOString().slice(0, 10);
  return (
    html.slice(0, start) +
    `<span class="last-updated">Last updated <time datetime="${iso}">${text}</time></span>` +
    html.slice(end)
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
