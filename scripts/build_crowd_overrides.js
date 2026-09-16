#!/usr/bin/env node
// ─── מה שהקהל אישר → js/crowd-overrides.js ──────────────────────────────────
//
// שכבה אחת, שני מקורות: rating_approvals (דירוגים) ו-duo_approvals (צמדים,
// כולל הורדות). הקובץ שנכתב כאן נקרא **רק** כשמוד הקהל דלוק.
//
// למה זה ולא כתיבה ל-data.js ול-chemistry_duos.csv, שזה מה שהיה קודם:
// החלטת הבעלים, והיא נכונה. אין מסלול שבו דעת קהל מגיעה למשחק הראשי — לא
// דרך אישור, לא דרך באג בסקריפט, ולא דרך טעות שלי. המשחק הראשי נשאר שלו.
//
//   node scripts/build_crowd_overrides.js            # מראה מה ישתנה
//   node scripts/build_crowd_overrides.js --write    # כותב באמת
//
// דורש SUPABASE_URL ו-SUPABASE_SERVICE_KEY.

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const WRITE = process.argv.includes('--write');
const ROOT  = path.join(__dirname, '..');
const OUT   = path.join(ROOT, 'js', 'crowd-overrides.js');

const URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) { console.error('חסר SUPABASE_URL או SUPABASE_SERVICE_KEY'); process.exit(1); }

const norm = s => String(s ?? '')
  .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
  .replace(/[\u05f3\u2019`\u00b4']/g, "'")
  .replace(/\s+/g, ' ').trim();

function tierOf(seasons, titles) {
  if (seasons >= 7 || (seasons >= 4 && titles >= 2)) return 3;
  if (seasons >= 4 || (seasons >= 3 && titles >= 1)) return 2;
  return 1;
}

async function get(pathq) {
  const r = await fetch(`${URL}/rest/v1/${pathq}`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`REST ${r.status}: ${await r.text()}`);
  return r.json();
}

function loadData() {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8') +
                  ';this.SQUADS=SQUADS;', ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'league_tables.js'), 'utf8') +
                  ';this.LEAGUE_TABLES=LEAGUE_TABLES;', ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'chem-data.js'), 'utf8') +
                  ';this.CHEM_PAIRS=CHEM_PAIRS;', ctx);
  return ctx;
}

function together(SQUADS, LEAGUE_TABLES, ka, kb) {
  const mine = new Map();
  SQUADS.forEach(sq => sq.players.forEach(p => {
    const k = norm(p.name);
    if (k !== ka && k !== kb) return;
    if (!mine.has(sq.id)) mine.set(sq.id, { teamId: sq.teamId, season: sq.season, who: new Set() });
    mine.get(sq.id).who.add(k);
  }));
  const seasons = new Set(); let titles = 0;
  for (const [, v] of mine) {
    if (v.who.size !== 2) continue;
    seasons.add(v.season);
    const t = LEAGUE_TABLES[v.season];
    if (t && t[0] && t[0].teamId === v.teamId) titles++;
  }
  return { seasons: seasons.size, titles };
}

(async () => {
  const [ratings, duos] = await Promise.all([
    get('rating_approvals?select=player_key,season,new_ovr&order=created_at.asc'),
    get('duo_approvals?select=pair_key&order=created_at.asc'),
  ]);

  const { SQUADS, LEAGUE_TABLES, CHEM_PAIRS } = loadData();

  const ovr = {};
  for (const r of ratings) ovr[norm(r.player_key) + '|' + r.season] = r.new_ovr;

  const add = {}, off = [];
  const skipped = [];
  for (const d of duos) {
    const isDrop = d.pair_key.charAt(0) === '-';
    const bare = isDrop ? d.pair_key.slice(1) : d.pair_key;
    const [ka, kb] = bare.split('|');
    if (!ka || !kb) { skipped.push([d.pair_key, 'מפתח פגום']); continue; }
    if (isDrop) {
      // ביטול של צמד שלא קיים במשחק הראשי הוא no-op, ועדיף לומר את זה
      if (!CHEM_PAIRS[bare]) { skipped.push([d.pair_key, 'לא קיים במשחק הראשי']); continue; }
      if (off.indexOf(bare) === -1) off.push(bare);
      continue;
    }
    const t = together(SQUADS, LEAGUE_TABLES, ka, kb);
    if (!t.seasons) { skipped.push([d.pair_key, 'מעולם לא חלקו סגל']); continue; }
    add[bare] = [tierOf(t.seasons, t.titles), t.seasons, t.titles];
  }

  console.log(`דירוגים: ${Object.keys(ovr).length} · צמדים שנוספו: ${Object.keys(add).length} · צמדים שבוטלו: ${off.length}`);
  skipped.forEach(([k, why]) => console.log(`  ⚠ ${k} — ${why}`));

  const head = fs.readFileSync(OUT, 'utf8').split('const CROWD_OVR')[0];
  const tail = fs.readFileSync(OUT, 'utf8');
  const readPart = tail.slice(tail.indexOf('/* ── הקריאה'));

  const body =
    'const CROWD_OVR = ' + JSON.stringify(ovr, null, 2) + ';\n\n' +
    'const CROWD_DUOS = ' + JSON.stringify(add, null, 2) + ';\n\n' +
    'const CROWD_DUOS_OFF = ' + JSON.stringify(off, null, 2) + ';\n\n';

  if (!WRITE) { console.log('\nיבש. להרצה אמיתית: --write'); return; }
  fs.writeFileSync(OUT, head + body + readPart);
  console.log(`\nנכתב ל-${OUT}. להריץ node scripts/stamp_assets.js ולקמט.`);
})().catch(e => { console.error(e.message); process.exit(1); });
