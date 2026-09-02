// Cache-busting stamps for our own js/ and css/, so those files can be cached
// FOREVER without a deploy ever serving a stale one.
//
// Why this exists, in one paragraph. index.html pulls 53 scripts and 7
// stylesheets by bare name. With any max-age on them, a returning player could
// run one deploy's HTML against another deploy's JavaScript — that is how fixed
// bugs came back. The safe-but-dumb answer, no-cache, makes every single page
// load spend ~60 conditional requests at the edge, and the free tier is metered
// in edge requests: at 60 a load, 1,000,000 requests is about 16,000 page views.
// Stamping the URL with a hash of the file gets both. The name changes whenever
// the bytes change, so `immutable` is honest, and a repeat visit fetches NOTHING
// but index.html.
//
// Idempotent: run it as often as you like. Run it after ANY edit to js/ or css/
// and before deploying — an unstamped edit is a change nobody's browser will
// ever see, because the old URL is cached for a year.
//
//   node scripts/stamp_assets.js          stamp, report what changed
//   node scripts/stamp_assets.js --check  exit 1 if anything is out of date

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE = path.join(__dirname, '..');
const PAGES = ['index.html', 'admin.html', 'contact.html'];

// src="js/x.js" / href="css/x.css", with or without a stamp already on it
const REF = /((?:src|href)=")((?:js|css)\/[A-Za-z0-9_.\-]+\.(?:js|css))(\?v=[A-Za-z0-9]+)?(")/g;

const hashes = new Map();
function stampFor(rel) {
  if (hashes.has(rel)) return hashes.get(rel);
  const file = path.join(BASE, rel);
  if (!fs.existsSync(file)) return null;          // a dead reference — leave it alone and shout
  const h = crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
  hashes.set(rel, h);
  return h;
}

const check = process.argv.includes('--check');
let changed = 0, missing = [];

for (const page of PAGES) {
  const file = path.join(BASE, page);
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(REF, (m, pre, rel, old, post) => {
    const h = stampFor(rel);
    if (!h) { missing.push(`${page} -> ${rel}`); return m; }
    return `${pre}${rel}?v=${h}${post}`;
  });
  if (after !== before) {
    changed++;
    if (!check) fs.writeFileSync(file, after);
    console.log(`${check ? 'STALE' : 'stamped'}: ${page}`);
  }
}

if (missing.length) {
  console.error('\nreferences to files that do not exist:');
  missing.forEach(m => console.error('  ' + m));
  process.exit(1);
}

if (check) {
  if (changed) {
    console.error(`\n${changed} page(s) carry stale asset stamps. Run: node scripts/stamp_assets.js`);
    process.exit(1);
  }
  console.log('all asset stamps current');
} else {
  console.log(changed ? `\nstamped ${changed} page(s), ${hashes.size} asset(s)`
                      : `nothing to do — ${hashes.size} asset(s) already current`);
}
