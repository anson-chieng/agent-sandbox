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

function classTokens(attrs) {
  // Walk attributes in order so quoted values can't be mistaken for attribute names.
  const re = /[\s/]*([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/y;
  let m;
  while ((m = re.exec(attrs)) && m[0] !== '') {
    if (m[1].toLowerCase() === 'class') return (m[2] ?? m[3] ?? m[4] ?? '').split(/\s+/);
  }
  return [];
}

function findPlaceholders(html) {
  // Blank out comments (keeping offsets) so commented-out markup is ignored.
  const masked = html.replace(/<!--[\s\S]*?-->/g, (c) => ' '.repeat(c.length));
  const tags = [...masked.matchAll(/<span\b((?:"[^"]*"|'[^']*'|[^>"'])*)>|<\/span\s*>/gi)];
  const found = [];
  tags.forEach((t, i) => {
    if (!t[0].startsWith('<span') || !classTokens(t[1]).includes('last-updated')) return;
    // Match the closing tag by nesting depth, not the first </span>.
    let depth = 1;
    let end = null;
    for (const n of tags.slice(i + 1)) {
      depth += n[0].startsWith('<span') ? 1 : -1;
      if (depth === 0) {
        end = n.index + n[0].length;
        break;
      }
    }
    found.push(end === null ? null : [t.index, end]);
  });
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
