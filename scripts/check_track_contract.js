// The client and the database have to agree on the payload, or telemetry dies
// quietly.
//
// On 2026-09-01 a migration retyped `p->>'client_id'` as `p->>'cid'` while
// adding one mode to the allowed list. js/track.js sends client_id, so every
// event was dropped by the NULL guard on the next line — for five and a half
// hours, with the RPC returning 204 the whole time, because the function did
// exactly what it was told. Nothing surfaced it: no error, no log, no failed
// request. The admin panel simply showed a flat line.
//
// This compares the keys js/track.js sends against the keys the newest
// definition of track() reads, and the modes the client can emit against the
// modes that definition allows. It is a text check on purpose — it needs no
// database, no keys and no network, so it can run anywhere.
//
// Run: node scripts/check_track_contract.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const R = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

let bad = 0;
const fail = (msg) => { console.log('FAIL  ' + msg); bad++; };
const pass = (msg) => console.log('PASS  ' + msg);

// ── what the client sends ────────────────────────────────────────────────────
const client = R('js/track.js');
const rpcCall = client.slice(client.indexOf("_supabase.rpc('track'"));
const sent = [...rpcCall.slice(0, 400).matchAll(/^\s*(\w+):/gm)].map(m => m[1]);
if (!sent.length) fail('could not read the payload out of js/track.js');

// ── what the live definition reads ───────────────────────────────────────────
const migDir = path.join(ROOT, 'supabase/migrations');
const defs = fs.readdirSync(migDir).filter(f => f.endsWith('.sql'))
  .filter(f => /FUNCTION\s+track\s*\(/i.test(fs.readFileSync(path.join(migDir, f), 'utf8')))
  .sort();
if (!defs.length) { console.log('no migration defines track()'); process.exit(1); }
const newest = defs[defs.length - 1];
// Comments are stripped first: these migrations explain the bug they fix, and a
// `p->>'cid'` quoted in the prose is not a key the function reads.
const sql = fs.readFileSync(path.join(migDir, newest), 'utf8')
  .split('\n').filter(l => !/^\s*--/.test(l)).join('\n');
const read = [...new Set([...sql.matchAll(/p->>'(\w+)'/g)].map(m => m[1]))];

console.log(`client js/track.js sends : ${sent.join(', ')}`);
console.log(`newest definition (${newest})`);
console.log(`  reads                  : ${[...new Set(read)].join(', ')}`);

for (const key of read) {
  if (!sent.includes(key)) {
    fail(`track() reads p->>'${key}', which js/track.js never sends` +
         ` — every event with that key required would be dropped`);
  }
}
if (!bad) pass('every key the function reads is a key the client sends');

// ── the mode allow-list has to cover every mode the client can emit ──────────
const allowed = (sql.match(/v_mode NOT IN \(([^)]*)\)/s) || [, ''])[1]
  .split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
const callers = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js'));
const emitted = new Set();
for (const f of callers) {
  const src = R('js/' + f);
  for (const m of src.matchAll(/\btrack\(\s*'(\w+)'\s*,\s*'([\w-]+)'/g)) emitted.add(m[2]);
}
const missing = [...emitted].filter(m => !allowed.includes(m));
console.log(`  allows                 : ${allowed.join(', ')}`);
console.log(`client can emit modes    : ${[...emitted].sort().join(', ')}`);
if (missing.length) {
  fail(`the client emits ${missing.join(', ')}, which track() drops silently`);
} else {
  pass('every mode the client emits is allowed');
}

// ── and the events ───────────────────────────────────────────────────────────
const allowedEv = (sql.match(/v_event NOT IN \(([^)]*)\)/s) || [, ''])[1]
  .split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
const emittedEv = new Set();
for (const f of callers) {
  for (const m of R('js/' + f).matchAll(/\btrack\(\s*'(\w+)'\s*,/g)) emittedEv.add(m[1]);
}
const missingEv = [...emittedEv].filter(e => !allowedEv.includes(e));
if (missingEv.length) fail(`the client emits event ${missingEv.join(', ')}, which track() drops silently`);
else pass('every event the client emits is allowed');

process.exit(bad ? 1 : 0);
