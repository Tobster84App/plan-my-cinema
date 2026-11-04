// Erzeugt dist/sw.js mit Precache-Liste und inhaltsbasierter Version.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const include = /\.(html|css|js|json|webmanifest|svg|png|ico|woff2)$/;
const exclude = [/^sw\.js$/, /^404\.html$/, /^index\.html$/, /^sitemap/];

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(dist)
  .map((p) => relative(dist, p).split(sep).join('/'))
  .filter((f) => include.test(f) && !exclude.some((re) => re.test(f)))
  .sort();

const hash = createHash('sha256');
for (const f of files) hash.update(f).update(readFileSync(join(dist, f)));
const version = hash.digest('hex').slice(0, 12);

// /de/index.html → /de/ (so werden die Seiten aufgerufen)
const urls = files.map((f) => '/' + f.replace(/(^|\/)index\.html$/, '$1'));

const tpl = readFileSync(new URL('./sw-template.js', import.meta.url), 'utf8');
writeFileSync(join(dist, 'sw.js'), tpl.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(urls, null, 2)));
console.log(`sw.js: ${urls.length} Dateien, Version ${version}`);
