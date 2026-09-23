# מצב סיפור, שלב 1: מנוע השוק ופרק אחד מקצה לקצה

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** פרק אחד, **הפועל ב"ש 2015/16**, משחקי מההתחלה ועד הסוף באתר: סגל אמיתי, תקציב, חלון קיץ, חצי עונה, חלון ינואר עם ערכים לפי ביצועים, סוף העונה עם כוכבים, ניקוד ושיא אישי. הקושי מכויל לטווח שנקבע במסמך.

**Architecture:** שלושה קבצים חדשים שכתובים כפונקציות גלובליות, כמו `game.js`, כדי שאפשר יהיה לטעון אותם ב-Node:
- `story-data.js`: דאטה.
- `story-market.js`: שוק טהור.
- `story-season.js`: חיבור לסימולציה.

עליהם יושבים `story.js` (זרימה ושמירה) ו-`story-screens.js` (UI). ב-`game.js` נכנסים רק ווים קטנים ושערים (`if (state.story)`). העונה משתמשת במנגנון התפר שכבר קיים בינואר: `halfHook` ו-`withSeededRandom`. החלון של הפרק פתוח לכל החלטה, ולכן אי אפשר לחשב את שני ההמשכים מראש. במקום זה העונה **משוחזרת מאותו seed** אחרי ההחלטה, וה-XI וה-opponents של הקיץ מוחזרים לפני השחזור. כך החצי הראשון יוצא זהה, ורק השני משתנה.

**Tech Stack:** JS ונילה בדפדפן, Node לבדיקות (`assert`, בלי framework), localStorage.

**Spec:** [docs/superpowers/specs/2026-09-23-story-mode-design.md](../specs/2026-09-23-story-mode-design.md)

---

## מה בכוונה לא בשלב הזה (לפי §11 במסמך)

| לא בשלב 1 | יגיע ב |
|---|---|
| מאמנים, ציר זמן, פיטורים, חוזים ובונוסים. בשלב 1 הפרק רץ **בלי מאמן** (`state.coach = null`) | שלב 2 |
| 8 הפרקים האחרים | שלבים 3-4 |
| לוח `story_scores`, מסך פרקים מלא, "מה חדש", **טלמטריה** | שלב 5 |

**הערה על טלמטריה:** `track()` מפיל בשקט כל mode שלא נמצא ב-allow-list של המיגרציה (ראו `scripts/check_track_contract.js`). לכן בשלב 1 **אסור** לקרוא ל-`track(…, 'story', …)`. בשלב 5 נוסיף מיגרציה.

## פישוטים מודעים של שלב 1 (מתועדים, לא באגים)

1. **ההרכב נבחר אוטומטית:** ה-11 הטובים לפי מערך וטקטיקה (`storyBestXI`). בחירה ידנית של ההרכב תבוא בשלב 2, יחד עם המאמן.
2. **שחקן שנמכר יוצא מהליגה** (נמכר לחו"ל) ולא מחזק יריבה. שחקן **שנקנה** כן יוצא מהסגל של המועדון שלו, והיריבה נחלשת. זה עומד בדרישה של §5 במסמך.
3. **"יריבה מעליך"** נקבעת לפי הטבלה האמיתית של העונה הקודמת, בשני החלונות. במסמך נכתב שבינואר זה לפי הטבלה שלך, אבל בתפר אין טבלה מלאה, יש רק את הנקודות שלך.
4. **שינוי בינואר מוותר על תנודת הפורם של העונה**, בדיוק כמו `janApply` היום (`halfHook` מחזיר `myLineRatings()` נקי). אם בינואר לא שינית כלום, נשארים עם עונת ה-`stay` המקורית.
5. **ריענון באמצע חלון ינואר = להישאר.** אותו חוק כמו ב-`january.js`.

---

## מבנה הקבצים

| קובץ | אחריות | נטען ב-Node? |
|---|---|---|
| `js/story-data.js` (חדש) | `STORY_RULES`, `STORY_VALUE_TIERS`, `STORY_CHAPTERS` | כן |
| `js/story-market.js` (חדש) | ערך, מחיר, run, קנייה ומכירה, יריבות, XI, כוכבים וניקוד | כן |
| `js/story-season.js` (חדש) | הצבת ה-XI ב-`state`, סטטיסטיקות לפי חצאים, הכנה ושחזור של העונה | כן |
| `js/story.js` (חדש) | run ב-localStorage, התחלה, כניסה לעונה, ווים ל-`game.js`, סוף | לא |
| `js/story-screens.js` (חדש) | מסך הפרקים, שוק (קיץ וינואר), תיבת סוף | לא |
| `js/game.js` (שינוי) | שערים וווים: `oppTeamsForState`, `animateResults`, `openSeam`, `bindSeason`, `wireEuropeButton`, `setupSaveSection`, שמירה ושחזור, `beginDraftWithState`, `restartGame` | כן, כבר |
| `js/january.js`, `js/cup.js` (שינוי) | שער `state.story` | — |
| `index.html` (שינוי) | `screen-story`, כרטיס במסך ההגדרות, 5 סקריפטים, `story-end-box` | — |
| `scripts/sim/story_test.js` (חדש) | בדיקות יחידה | — |
| `scripts/sim/story_calibrate.js` (חדש) | בוט, אלפי ריצות, אחוזי כוכבים | — |

---

### Task 1: דאטה ושוק טהור

**Files:**
- Create: `js/story-data.js`
- Create: `js/story-market.js`
- Create: `scripts/sim/story_test.js`

- [ ] **Step 1: כתוב את מתקן הבדיקות ואת הבדיקות של השוק (נכשלות)**

`scripts/sim/story_test.js`:

```js
// scripts/sim/story_test.js — unit tests for מצב סיפור. No framework: node + assert.
//   node scripts/sim/story_test.js
// Loads the same bundle the browser runs (data, tables, engine, game, league-sim)
// plus the three story files, exactly like scripts/sim/golden-v1.js does.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const STUB = `
const document = { addEventListener(){}, getElementById(){ return null; },
  querySelectorAll(){ return []; }, querySelector(){ return null; },
  createElement(){ return { style:{}, classList:{ add(){}, remove(){} } }; } };
const window = {};
const localStorage = { getItem(){ return null; }, setItem(){}, removeItem(){} };
const getCurrentUser = () => null;
const _supabase = { rpc(){ return Promise.resolve(); } };
`;
const MULBERRY = `
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);
t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
`;
const FILES = ['js/data.js', 'js/league_tables.js', 'js/sim-engine.js', 'js/game.js',
  'js/league-sim.js', 'js/story-data.js', 'js/story-market.js', 'js/story-season.js'];
const EXPORTS = ['state', 'SQUADS', 'LEAGUE_TABLES', 'FORMATIONS', 'formationSlots',
  'simTeamsForSeason', 'withSeededRandom', 'generateMatches', 'generateLeagueTable',
  'seasonFormat', 'myLineRatings', 'teamOVR', 'simulatePlayerStats', 'SIM_ENGINE_CURRENT',
  'STORY_RULES', 'STORY_CHAPTERS', 'storyChapter', 'storyValueOfOvr', 'storyPrevSeason',
  'storySummerValue', 'storyPerfBonus', 'storyJanValue', 'storySellPrice', 'storyBuyPrice',
  'storyIsRival', 'storyReal', 'storyHomeSquad', 'storyNewRun', 'storyOwned', 'storyMarketPool',
  'storyBuy', 'storySell', 'storyOpponents', 'storyBestXI', 'storyStars', 'storyScore',
  'storyApplyXI', 'storyXiOvr', 'storyStatsFor', 'storyMergeStats', 'storySimulateFn',
  'storySeasonPrepare', 'storySeasonResim', 'storyOppForSim'];

function load() {
  return new Function(STUB + MULBERRY + FILES.map(read).join('\n') +
    `;return {${EXPORTS.join(',')}};`)();
}
module.exports = { load };

if (require.main === module) {
  const G = load();
  let n = 0;
  const t = (name, fn) => { fn(); n++; console.log('PASS  ' + name); };
  const ch = G.storyChapter('b7-2015');

  // ── Task 1: the market ─────────────────────────────────────────────────────
  t('chapter exists and its home squad is the real one', () => {
    assert.ok(ch);
    const home = G.storyHomeSquad(ch);
    assert.strictEqual(home.teamId, 'hapoel-beersheba');
    assert.strictEqual(home.season, '2015/16');
  });
  t('real finish is read from LEAGUE_TABLES', () => {
    const r = G.storyReal(ch);
    assert.deepStrictEqual([r.pos, r.pts, r.n], [1, 83, 14]);
  });
  t('previous season string', () => {
    assert.strictEqual(G.storyPrevSeason('2015/16'), '2014/15');
    assert.strictEqual(G.storyPrevSeason('2000/01'), '1999/00');
  });
  t('value tiers', () => {
    assert.strictEqual(G.storyValueOfOvr(90), 14);
    assert.strictEqual(G.storyValueOfOvr(84), 7);
    assert.strictEqual(G.storyValueOfOvr(79), 1.2);
    assert.strictEqual(G.storyValueOfOvr(60), 0.5);
  });
  t('reputation premium: last season top scorer is dearer in summer', () => {
    // מאור בוזגלו was 3rd scorer and top assister of 2014/15 (LEAGUE_SCORERS/ASSISTS)
    const p = { name: 'מאור בוזגלו', ovr: 84, position: 'LW' };
    assert.strictEqual(G.storySummerValue(p, '2015/16'), 8.8);         // 7 × 1.25 → 8.75 → 8.8
    assert.strictEqual(G.storySummerValue({ name: 'אף אחד', ovr: 84 }, '2015/16'), 7);
  });
  t('performance bonus: a 79 striker with 11 goals is valued like an 84', () => {
    assert.strictEqual(G.storyPerfBonus('ST', { goals: 11, assists: 0, cs: 0 }), 5);
    assert.strictEqual(G.storyJanValue({ ovr: 79, position: 'ST' }, { goals: 11, assists: 0, cs: 0 }), 7);
    assert.strictEqual(G.storyPerfBonus('ST', { goals: 0, assists: 0, cs: 0 }), -2);
    assert.strictEqual(G.storyPerfBonus('CB', { goals: 0, assists: 0, cs: 10 }), 4);
    assert.strictEqual(G.storyPerfBonus('GK', null), 0);
  });
  t('prices', () => {
    assert.strictEqual(G.storySellPrice(7), 5.6);
    assert.strictEqual(G.storyBuyPrice(7, false), 7);
    assert.strictEqual(G.storyBuyPrice(7, true), 10.5);
  });
  t('rival = finished above you last season', () => {
    // 2014/15: maccabi-tlv 1st, hapoel-beersheba 3rd
    assert.strictEqual(G.storyIsRival(ch, 'maccabi-tlv'), true);
    assert.strictEqual(G.storyIsRival(ch, 'bnei-sakhnin'), false);
  });
  t('a new run owns the real squad and the chapter budget', () => {
    const run = G.storyNewRun(ch, 42);
    assert.strictEqual(run.own.length, G.storyHomeSquad(ch).players.length);
    assert.strictEqual(run.budget, ch.budget);
    assert.strictEqual(run.phase, 'summer');
    assert.strictEqual(G.storyOwned(run).length, run.own.length);
  });
  t('buy moves a player in, charges, and removes him from the pool', () => {
    const run = G.storyNewRun(ch, 1);
    run.budget = 50;
    const pool = G.storyMarketPool(run, ch);
    const e = pool[0];
    assert.strictEqual(G.storyBuy(run, ch, e, 7), null);
    assert.strictEqual(run.budget, 43);
    assert.strictEqual(run.buys.summer, 1);
    assert.ok(G.storyOwned(run).some(x => x.player.name === e.player.name));
    assert.ok(!G.storyMarketPool(run, ch).some(x => x.squad.id === e.squad.id && x.player.name === e.player.name));
  });
  t('buy is refused over budget and over the window limit', () => {
    const run = G.storyNewRun(ch, 1);
    run.budget = 3;
    const pool = G.storyMarketPool(run, ch);
    assert.strictEqual(G.storyBuy(run, ch, pool[0], 4), 'אין מספיק תקציב');
    run.budget = 100;
    for (let i = 0; i < 4; i++) assert.strictEqual(G.storyBuy(run, ch, pool[i], 1), null);
    assert.strictEqual(G.storyBuy(run, ch, pool[5], 1), 'נגמרו הרכישות בחלון הזה');
  });
  t('sell credits and respects the minimum squad', () => {
    const run = G.storyNewRun(ch, 1);
    const owned = G.storyOwned(run);
    assert.strictEqual(G.storySell(run, owned[0], 2.5), null);
    assert.strictEqual(run.budget, G.storyChapter('b7-2015').budget + 2.5);
    while (run.own.length > G.STORY_RULES.minSquad) G.storySell(run, G.storyOwned(run)[0], 0);
    assert.ok(/מתחת/.test(G.storySell(run, G.storyOwned(run)[0], 0)));
  });
  t('opponents: the 13 other clubs, rated exactly like simTeamsForSeason', () => {
    const run = G.storyNewRun(ch, 1);
    const opp = G.storyOpponents(ch, run, 'summer');
    assert.strictEqual(opp.length, 13);
    assert.ok(!opp.some(o => o.teamId === 'hapoel-beersheba'));
    const ref = G.simTeamsForSeason(2015, 14);
    for (const o of opp) {
      const r = ref.find(x => x.teamId === o.teamId);
      assert.deepStrictEqual([o.ovr, o.atk, o.def], [r.ovr, r.atk, r.def]);
    }
  });
  t('buying a rival\'s stars weakens that rival', () => {
    const run = G.storyNewRun(ch, 1);
    run.budget = 100;
    // Three, not one: a single signing can be covered by an equally rated squad man.
    const stars = G.storyMarketPool(run, ch).filter(e => e.squad.teamId === 'maccabi-tlv')
      .sort((a, b) => b.player.ovr - a.player.ovr).slice(0, 3);
    const before = G.storyOpponents(ch, run, 'all').find(o => o.teamId === 'maccabi-tlv');
    stars.forEach(e => assert.strictEqual(G.storyBuy(run, ch, e, 1), null));
    const after = G.storyOpponents(ch, run, 'all').find(o => o.teamId === 'maccabi-tlv');
    assert.ok(after.ovr <= before.ovr);
    assert.ok(after.atk + after.mid + after.def + after.gk < before.atk + before.mid + before.def + before.gk);
  });
  t('a January buy does not touch the summer opponents', () => {
    const run = G.storyNewRun(ch, 1);
    run.budget = 100; run.phase = 'jan';
    const star = G.storyMarketPool(run, ch).filter(e => e.squad.teamId === 'maccabi-tlv')
      .sort((a, b) => b.player.ovr - a.player.ovr)[0];
    const s0 = JSON.stringify(G.storyOpponents(ch, run, 'summer'));
    G.storyBuy(run, ch, star, 1);
    assert.strictEqual(JSON.stringify(G.storyOpponents(ch, run, 'summer')), s0);
  });
  t('best XI fills every slot, natural positions first', () => {
    const run = G.storyNewRun(ch, 1);
    const slots = G.formationSlots('4-3-3', 'bal');
    const xi = G.storyBestXI(G.storyOwned(run), slots);
    assert.strictEqual(xi.filter(Boolean).length, 11);
    assert.strictEqual(new Set(xi.map(p => p.player.name)).size, 11);
    assert.strictEqual(xi[0].player.position, 'GK');
  });
  t('stars and score', () => {
    const r = G.storyReal(ch);
    assert.deepStrictEqual(G.storyStars(ch, { rank: 1, points: r.pts + 1, budget: ch.budget }), [true, true, true]);
    assert.deepStrictEqual(G.storyStars(ch, { rank: 2, points: r.pts, budget: ch.budget - 1 }), [false, false, false]);
    assert.strictEqual(G.storyScore(ch, { rank: 1, points: r.pts + 5, budget: 10 }),
      (G.storyStars(ch, { rank: 1, points: r.pts + 5, budget: 10 }).filter(Boolean).length) * 1000 + 100 + 100);
  });

  if (process.argv.includes('--season')) require('./story_test_season.js')(G, t);
  console.log(`\n${n} passed`);
}
```

הערה: ה-`require` של `story_test_season.js` תלוי בדגל `--season`, כדי ש-Task 1 ירוץ לפני שהקובץ קיים. ב-Task 2 הדגל נכנס לפקודה.

- [ ] **Step 2: הרץ ווודא שהבדיקות נכשלות**

Run: `node scripts/sim/story_test.js`
Expected: קריסה עם `ENOENT: … js/story-data.js`.

- [ ] **Step 3: כתוב את `js/story-data.js`**

```js
/* ── מצב סיפור: the chapters ──────────────────────────────────────────────────
 *
 * Data only: what a chapter IS, never how it plays. See
 * docs/superpowers/specs/2026-09-23-story-mode-design.md.
 *
 * `budget` is millions of ₪ and is SET BY scripts/sim/story_calibrate.js, never
 * by feel — the owner's one standing rule for this mode is that it has to be
 * hard, and a number chosen by eye is a number nobody measured.
 *
 * The real finish is deliberately NOT written here. It is read from
 * LEAGUE_TABLES (storyReal), so the "you vs. reality" line can never disagree
 * with the table the rest of the site shows.
 */
const STORY_RULES = {
  sellRate: 0.8,          // a sale fetches 80% of value — the friction that stops churn
  rivalMarkup: 1.5,       // a club that finished above you will not strengthen you cheaply
  repPremium: 1.25,       // last season's top scorers / assisters, summer only
  buys: { summer: 4, jan: 2 },
  minSquad: 16,
};

// ₪M by rating. A step curve, like the salary cap's (js/salary.js), because a
// price is something the player has to hold in their head while deciding.
const STORY_VALUE_TIERS = [
  { min: 88, v: 14 },
  { min: 86, v: 10 },
  { min: 84, v: 7 },
  { min: 82, v: 4.5 },
  { min: 80, v: 2.5 },
  { min: 78, v: 1.2 },
  { min: 0,  v: 0.5 },
];

const STORY_CHAPTERS = [
  {
    id: 'b7-2015',
    teamId: 'hapoel-beersheba',
    season: '2015/16',
    title: '40 שנה אחרי',
    level: 'normal',
    budget: 8,
    intro: 'הפועל באר שבע לא זכתה באליפות מאז 1976. על הנייר זה הסגל הכי חזק בליגה, ' +
           'אבל מכבי תל אביב צמודה אליו והקופה כמעט ריקה. כל שקל שתוציא על חלוץ ' +
           'הוא שקל שלא יחזור.',
    stars: [
      { type: 'rank', max: 1, label: 'אליפות' },
      { type: 'beatPoints', label: 'יותר נקודות מהעונה האמיתית' },
      { type: 'profit', label: 'לסיים עם תקציב שלא ירד מהפתיחה' },
    ],
  },
];
```

- [ ] **Step 4: כתוב את `js/story-market.js`**

```js
/* ── מצב סיפור: the market ────────────────────────────────────────────────────
 *
 * Pure functions over a `run` and the season's squads. No DOM and no `state`,
 * so scripts/sim/story_calibrate.js can load this beside game.js in Node and
 * play thousands of chapters. The two game.js helpers used here (playerFitsSlot,
 * slotFitPos) are pure too. Everything that touches the pitch is in
 * js/story-season.js.
 *
 * A run:
 *   { v, chapterId, seed, budget, phase: 'summer'|'season'|'jan'|'done',
 *     formationId, tactic,
 *     own:    [{ squadId, name }]                       — the squad you hold
 *     bought: [{ squadId, name, window, price }]        — every signing, even if resold
 *     sold:   [{ squadId, name, window, price }]
 *     buys:   { summer, jan }                           — signings used per window
 *     result: { rank, points, budget, stars, score }    — once phase is 'done' }
 */

function storyChapter(id) { return STORY_CHAPTERS.find(c => c.id === id) || null; }
function storyRound1(n) { return Math.round(n * 10) / 10; }

function storyValueOfOvr(ovr) {
  const n = Number(ovr) || 0;
  return STORY_VALUE_TIERS.find(t => n >= t.min).v;
}

// '2015/16' → '2014/15'
function storyPrevSeason(season) {
  const y = parseInt(season, 10);
  return `${y - 1}/${String(y).slice(-2)}`;
}

// Scraped names carry stray direction marks ('יוסי אבוקסיס‎'); the tables do not.
function storyNameKey(n) { return String(n || '').replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim(); }

const _storyRepCache = {};
function storyRepNames(season) {
  if (_storyRepCache[season]) return _storyRepCache[season];
  const prev = storyPrevSeason(season);
  const out = new Set();
  const add = src => ((src && src[prev]) || []).forEach(r => out.add(storyNameKey(r.name)));
  add(typeof LEAGUE_SCORERS !== 'undefined' ? LEAGUE_SCORERS : null);
  add(typeof LEAGUE_ASSISTS !== 'undefined' ? LEAGUE_ASSISTS : null);
  return (_storyRepCache[season] = out);
}

function storySummerValue(player, season) {
  const base = storyValueOfOvr(player.ovr);
  return storyRound1(storyRepNames(season).has(storyNameKey(player.name))
    ? base * STORY_RULES.repPremium : base);
}

// What half a season in YOUR simulation did to a player's price, in rating points.
// Attackers and midfielders are paid for goals and assists, the back line and
// the keeper for clean sheets. Anchored so that a 79 striker with 11 goals by
// January is priced like an 84 (the owner's own example, spec §5).
const STORY_ATT = ['ST', 'CF', 'LW', 'RW', 'LM', 'RM', 'CAM'];
const STORY_MID = ['CM', 'CDM'];
function storyPerfBonus(position, stats) {
  if (!stats) return 0;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const out = (stats.goals || 0) + 0.5 * (stats.assists || 0);
  if (STORY_ATT.includes(position)) return clamp(Math.round((out - 3) / 1.5), -2, 6);
  if (STORY_MID.includes(position)) return clamp(Math.round((out - 2) / 1.5), -2, 6);
  return clamp(Math.round(((stats.cs || 0) - 4) / 1.5), -1, 4);
}
function storyJanValue(player, stats) {
  return storyValueOfOvr((Number(player.ovr) || 0) + storyPerfBonus(player.position, stats));
}

function storySellPrice(value) { return storyRound1(value * STORY_RULES.sellRate); }
function storyBuyPrice(value, rival) { return storyRound1(value * (rival ? STORY_RULES.rivalMarkup : 1)); }

function storyPrevPos(teamId, season) {
  const t = (typeof LEAGUE_TABLES !== 'undefined' && LEAGUE_TABLES[storyPrevSeason(season)]) || [];
  const r = t.find(x => x.teamId === teamId);
  return r ? r.pos : Infinity;              // promoted last summer: below everyone
}
function storyIsRival(ch, sellerTeamId) {
  return storyPrevPos(sellerTeamId, ch.season) < storyPrevPos(ch.teamId, ch.season);
}

function storyReal(ch) {
  const t = (typeof LEAGUE_TABLES !== 'undefined' && LEAGUE_TABLES[ch.season]) || [];
  const r = t.find(x => x.teamId === ch.teamId);
  return r ? { pos: r.pos, pts: r.pts, n: t.length } : null;
}

function storySeasonSquads(season) { return SQUADS.filter(s => s.season === season); }
function storyHomeSquad(ch) {
  return SQUADS.find(s => s.teamId === ch.teamId && s.season === ch.season) || null;
}
function storyRefKey(r) { return r.squadId + '|' + r.name; }

function storyNewRun(ch, seed) {
  const home = storyHomeSquad(ch);
  return {
    v: 1, chapterId: ch.id, seed: seed >>> 0, budget: ch.budget, phase: 'summer',
    formationId: '4-3-3', tactic: 'bal',
    own: home.players.map(p => ({ squadId: home.id, name: p.name })),
    bought: [], sold: [], buys: { summer: 0, jan: 0 },
  };
}

function storyResolve(ref) {
  const squad = SQUADS.find(s => s.id === ref.squadId);
  const player = squad && squad.players.find(p => p.name === ref.name);
  return (squad && player) ? { player, squad } : null;
}
function storyOwned(run) { return run.own.map(storyResolve).filter(Boolean); }

// Everyone who played in the league that season, bar your own club and anyone
// already signed (a signing who was sold on has left the league).
function storyMarketPool(run, ch) {
  const taken = new Set(run.bought.map(storyRefKey));
  const out = [];
  for (const sq of storySeasonSquads(ch.season)) {
    if (sq.teamId === ch.teamId) continue;
    for (const p of sq.players) {
      if (!taken.has(sq.id + '|' + p.name)) out.push({ player: p, squad: sq });
    }
  }
  return out;
}

function storyBuyBlock(run, price) {
  const w = run.phase;
  if (w !== 'summer' && w !== 'jan') return 'החלון סגור';
  if (run.buys[w] >= STORY_RULES.buys[w]) return 'נגמרו הרכישות בחלון הזה';
  if (price > run.budget + 1e-9) return 'אין מספיק תקציב';
  return null;
}
// Returns null on success, or the reason in Hebrew — the UI shows it as is.
function storyBuy(run, ch, entry, price) {
  const why = storyBuyBlock(run, price);
  if (why) return why;
  const ref = { squadId: entry.squad.id, name: entry.player.name };
  run.budget = storyRound1(run.budget - price);
  run.own.push(ref);
  run.bought.push({ ...ref, window: run.phase, price });
  run.buys[run.phase]++;
  return null;
}

function storySellBlock(run) {
  if (run.phase !== 'summer' && run.phase !== 'jan') return 'החלון סגור';
  if (run.own.length <= STORY_RULES.minSquad) return `הסגל לא יכול לרדת מתחת ל-${STORY_RULES.minSquad}`;
  return null;
}
function storySell(run, entry, price) {
  const why = storySellBlock(run);
  if (why) return why;
  const k = entry.squad.id + '|' + entry.player.name;
  const i = run.own.findIndex(r => storyRefKey(r) === k);
  if (i < 0) return 'השחקן לא בסגל';
  run.own.splice(i, 1);
  run.sold.push({ squadId: entry.squad.id, name: entry.player.name, window: run.phase, price });
  run.budget = storyRound1(run.budget + price);
  return null;
}

// The same rating simTeamsForSeason gives a club (top-11 average + V2 lines),
// computed from the squad AFTER your signings left it.
function storyClubRating(teamId, players) {
  const top = [...players].sort((a, b) => b.ovr - a.ovr).slice(0, 11);
  const ovr = Math.round(top.reduce((s, p) => s + p.ovr, 0) / Math.max(1, top.length));
  return {
    teamId,
    name: ((typeof TEAMS !== 'undefined' && TEAMS[teamId]) || { name: teamId }).name,
    ovr,
    ...simLineRatingsForSquad(players, ovr),
  };
}
// upTo: 'summer' — only summer signings have left their clubs (the first half),
//       'all'    — January signings too (the second half).
function storyOpponents(ch, run, upTo) {
  const gone = new Set(run.bought
    .filter(b => upTo === 'all' || b.window === 'summer').map(storyRefKey));
  return storySeasonSquads(ch.season)
    .filter(sq => sq.teamId !== ch.teamId)
    .map(sq => storyClubRating(sq.teamId, sq.players.filter(p => !gone.has(sq.id + '|' + p.name))))
    .sort((a, b) => b.ovr - a.ovr);
}

// The eleven that start: scarcest slot first, best natural fit, and only then
// the best man left out of position. Phase 1 picks it for you (plan §פישוטים 1).
function storyBestXI(entries, slots) {
  const pool = entries.slice().sort((a, b) => b.player.ovr - a.player.ovr);
  const fits = (e, i) => playerFitsSlot(e.player, slotFitPos(slots[i]));
  const order = slots.map((_, i) => i).sort((a, b) =>
    (pool.filter(e => fits(e, a)).length - pool.filter(e => fits(e, b)).length) || (a - b));
  const used = new Set();
  const picks = new Array(slots.length).fill(null);
  for (const i of order) {
    const pick = pool.find(e => !used.has(e) && fits(e, i)) || pool.find(e => !used.has(e));
    if (pick) { picks[i] = pick; used.add(pick); }
  }
  return picks;
}

// res: { rank, points, budget } — budget is what is left at the end.
function storyStars(ch, res) {
  const real = storyReal(ch);
  return ch.stars.map(s => {
    if (s.type === 'rank') return res.rank <= s.max;
    if (s.type === 'beatPoints') return !!real && res.points > real.pts;
    if (s.type === 'profit') return res.budget >= ch.budget;
    return false;
  });
}
function storyScore(ch, res) {
  const real = storyReal(ch);
  const stars = storyStars(ch, res).filter(Boolean).length;
  return stars * 1000 + (real ? (res.points - real.pts) * 20 : 0) + Math.round(res.budget * 10);
}
```

- [ ] **Step 5: צור את `js/story-season.js` כקובץ ריק זמני**, כדי שהמתקן ייטען. התוכן המלא נכתב ב-Task 2.

```js
/* ── מצב סיפור: the season ── (filled in by Task 2) */
```

- [ ] **Step 6: הרץ את הבדיקות**

Run: `node scripts/sim/story_test.js`
Expected: `PASS` לכל 16 הבדיקות, ובסוף `16 passed`.

אם `reputation premium` נכשל, בדוק ב-`LEAGUE_SCORERS['2014/15']` שבוזגלו מופיע בדיוק בשם הזה. **אל תשנה את הבדיקה.** תקן את `storyNameKey` אם זה עניין של תווים נסתרים.

- [ ] **Step 7: Commit**

```bash
git add js/story-data.js js/story-market.js js/story-season.js scripts/sim/story_test.js
git commit -m "feat(story): chapter data and a pure transfer market

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: חיבור לסימולציה, עונה בשני חצאים מ-seed אחד

**Files:**
- Modify: `js/story-season.js` (החלפת כל התוכן)
- Create: `scripts/sim/story_test_season.js`

- [ ] **Step 1: כתוב את הבדיקות (נכשלות)**

`scripts/sim/story_test_season.js`:

```js
// Season-level tests for מצב סיפור. Run through story_test.js --season.
const assert = require('assert');
module.exports = function (G, t) {
  const ch = G.storyChapter('b7-2015');
  const setUp = (run) => {
    Object.assign(G.state, { story: { chapterId: ch.id }, peakMode: false, classic: false,
      coach: null, oppSeason: 2015, leagueFormat: 'authentic' });
    G.storyApplyXI(run);
  };

  t('storyApplyXI puts eleven on the pitch', () => {
    const run = G.storyNewRun(ch, 7);
    setUp(run);
    assert.strictEqual(G.state.picks.filter(Boolean).length, 11);
    assert.ok(G.teamOVR() >= 80);
  });
  t('storyXiOvr does not disturb state', () => {
    const run = G.storyNewRun(ch, 7);
    setUp(run);
    const keep = JSON.stringify(G.state.picks.map(p => p.player.name));
    run.formationId = '4-4-2';
    G.storyXiOvr(run);
    assert.strictEqual(JSON.stringify(G.state.picks.map(p => p.player.name)), keep);
  });
  t('merge adds halves by name', () => {
    const m = G.storyMergeStats([{ name: 'a', goals: 2, assists: 1, cs: 0 }],
      [{ name: 'a', goals: 1, assists: 0, cs: 1 }, { name: 'b', goals: 3, assists: 0, cs: 0 }]);
    assert.deepStrictEqual(m.map(x => [x.name, x.goals, x.assists, x.cs]), [['a', 3, 1, 1], ['b', 3, 0, 0]]);
  });
  t('prepare: a full season, split at the seam, deterministic from the seed', () => {
    const run = G.storyNewRun(ch, 12345);
    setUp(run);
    const sim = G.storySimulateFn(ch, run);
    const a = G.storySeasonPrepare(sim, run, ch);
    setUp(run);
    const b = G.storySeasonPrepare(G.storySimulateFn(ch, run), run, ch);
    assert.ok(a && a.played > 0);
    assert.ok([33, 36].includes(a.stay.matches.length));   // top six plays 36, the lower playoff 33
    assert.deepStrictEqual(a.stay.matches.map(m => m.gf + ':' + m.ga), b.stay.matches.map(m => m.gf + ':' + m.ga));
    assert.ok(a.stay.leagueTable.some(r => r.us && r.name === 'הפועל באר שבע'));
  });
  t('resim after a January signing: identical first half, different second', () => {
    const run = G.storyNewRun(ch, 999);
    setUp(run);
    const pair = G.storySeasonPrepare(G.storySimulateFn(ch, run), run, ch);
    run.phase = 'jan'; run.budget = 100;
    const star = G.storyMarketPool(run, ch).sort((x, y) => y.player.ovr - x.player.ovr)[0];
    assert.strictEqual(G.storyBuy(run, ch, star, 1), null);
    const s = G.storySeasonResim(pair, run, ch);
    const h = pair.played;
    const key = ms => ms.map(m => m.opponent + m.gf + ':' + m.ga);
    assert.deepStrictEqual(key(s.matches.slice(0, h)), key(pair.stay.matches.slice(0, h)));
    assert.notDeepStrictEqual(key(s.matches), key(pair.stay.matches));
    assert.ok(G.state.picks.some(p => p.player.name === star.player.name));
  });
  t('first-half scorers are the same in both futures', () => {
    const run = G.storyNewRun(ch, 4242);
    setUp(run);
    const pair = G.storySeasonPrepare(G.storySimulateFn(ch, run), run, ch);
    const before = JSON.stringify(pair.stay.matches.slice(0, pair.played).map(m => m.scorers));
    run.phase = 'jan'; run.formationId = '4-4-2';
    const s = G.storySeasonResim(pair, run, ch);
    assert.strictEqual(JSON.stringify(s.matches.slice(0, pair.played).map(m => m.scorers)), before);
  });
};
```

- [ ] **Step 2: הרץ ווודא שהבדיקות נכשלות**

Run: `node scripts/sim/story_test.js --season`
Expected: 16 PASS ואחריהן קריסה, `storyApplyXI is not a function` או ReferenceError בזמן הטעינה.

- [ ] **Step 3: כתוב את `js/story-season.js`**

```js
/* ── מצב סיפור: the season ────────────────────────────────────────────────────
 *
 * The bridge between the market (js/story-market.js) and the engine that
 * already exists. No DOM: it reads and writes `state` the way the draft does, so
 * the results screen, the pitch and the share card work unchanged — and so the
 * calibration harness can run it in Node.
 *
 * The January window here is not js/january.js. That one knows its single
 * transfer before the season is played and simulates both futures up front. A
 * story window is a whole market, so the future cannot be known in advance.
 * Instead the season is REPLAYED from the same seed once the market closes:
 * the summer XI and the summer opponents are put back, the first half consumes
 * the RNG exactly as it did, and the January XI goes in at the seam. First half
 * identical, second half yours — the same guarantee january.js gives, reached
 * the other way round.
 */

// Put the run's best eleven on the pitch, in its formation and tactic.
function storyApplyXI(run) {
  state.formationId = run.formationId;
  state.tactic = tacticOf(run.tactic);
  state.slots = formationSlots(state.formationId, state.tactic);
  state.picks = storyBestXI(storyOwned(run), state.slots);
  return state.picks;
}

function storySnapshot() {
  return { formationId: state.formationId, tactic: state.tactic,
           slots: state.slots.slice(), picks: state.picks.slice() };
}

// The rating the run's XI would have, without leaving a trace on `state`.
function storyXiOvr(run) {
  const keep = storySnapshot();
  try { storyApplyXI(run); return teamOVR(); } finally { Object.assign(state, keep); }
}

// simulatePlayerStats credits whoever is in state.picks, so each half is credited
// with the eleven who actually played it — and seeded, so both futures of the
// first half name the same scorers.
function storyStatsFor(snap, matches, seed) {
  const keep = storySnapshot();
  Object.assign(state, { formationId: snap.formationId, tactic: snap.tactic,
                         slots: snap.slots, picks: snap.picks });
  try { return withSeededRandom(seed, () => simulatePlayerStats(matches)); }
  finally { Object.assign(state, keep); }
}

function storyMergeStats(a, b) {
  const by = new Map();
  for (const p of [...a, ...b]) {
    const cur = by.get(p.name);
    if (!cur) by.set(p.name, { ...p });
    else { cur.goals += p.goals; cur.assists += p.assists; cur.cs += p.cs; }
  }
  return [...by.values()];
}

function storyNameUs(season, ch) {
  const name = ((typeof TEAMS !== 'undefined' && TEAMS[ch.teamId]) || {}).name;
  if (name) season.leagueTable.forEach(r => { if (r.us) r.name = name; });
  return season;
}

// The opponents the CURRENT simulation is playing. The January hook rewrites
// these objects in place — the fixture pool holds references to them, so a
// rival who lost his striker in January plays the second half without him.
let _storyOppLive = null;
function storyOppForSim(ch, run) {
  _storyOppLive = storyOpponents(ch, run, 'summer');
  return _storyOppLive;
}
function storyOppJanuary(ch, run) {
  if (!_storyOppLive) return;
  const next = storyOpponents(ch, run, 'all');
  for (const o of _storyOppLive) {
    const n = next.find(x => x.teamId === o.teamId);
    if (n) Object.assign(o, n);
  }
}

// A simulate() with the same shape animateResults builds, for Node. The browser
// passes animateResults' own closure instead — it reaches the same opponents
// through oppTeamsForState(), which story.js points at storyOppForSim.
function storySimulateFn(ch, run) {
  return (halfHook = null) => {
    const spec = seasonFormat(parseInt(ch.season, 10));
    const g = generateMatches(myLineRatings(), storyOppForSim(ch, run), spec, SIM_ENGINE_CURRENT, halfHook);
    let w = 0, d = 0;
    g.matches.forEach(m => { if (m.outcome === 'W') w++; else if (m.outcome === 'D') d++; });
    const l = g.matches.length - w - d;
    return {
      ovr: teamOVR(), engine: SIM_ENGINE_CURRENT, matches: g.matches, inTopSix: g.inTopSix,
      leagueTable: spec.modern
        ? generateLeagueTable(w, d, l, g.inTopSix, g.champOpponents, g.relegOpponents)
        : generateAuthenticTable(w, d, l, g),
      playerStats: simulatePlayerStats(g.matches),
    };
  };
}

// The summer half of the chapter. Returns the season as it runs with no January
// changes (`stay`), plus everything the replay needs.
function storySeasonPrepare(simulate, run, ch) {
  const snapA = storySnapshot();
  let firstHalf = null;
  const stay = withSeededRandom(run.seed, () => simulate(fh => { firstHalf = fh; return null; }));
  if (!firstHalf || !firstHalf.length) return null;
  const played = firstHalf.length;
  const firstStats = storyStatsFor(snapA, stay.matches.slice(0, played), run.seed + 1);
  const rest = storyStatsFor(snapA, stay.matches.slice(played), run.seed + 2);
  stay.playerStats = storyMergeStats(firstStats, rest);
  storyNameUs(stay, ch);
  return { story: true, stay, played, firstHalf: stay.matches.slice(0, played),
           firstStats, snapA, simulate };
}

// After the January market has committed into `run`: replay from the same seed.
function storySeasonResim(pair, run, ch) {
  Object.assign(state, { formationId: pair.snapA.formationId, tactic: pair.snapA.tactic,
                         slots: pair.snapA.slots.slice(), picks: pair.snapA.picks.slice() });
  let snapB = null;
  const season = withSeededRandom(run.seed, () => pair.simulate(() => {
    storyApplyXI(run);
    storyOppJanuary(ch, run);
    snapB = storySnapshot();
    return myLineRatings();
  }));
  const played = pair.played;
  // simulate() credited the whole season to the January XI and rewrote the
  // first half's scorers doing it. Put the real ones back, then credit the rest.
  storyStatsFor(pair.snapA, season.matches.slice(0, played), run.seed + 1);
  const rest = storyStatsFor(snapB, season.matches.slice(played), run.seed + 2);
  season.playerStats = storyMergeStats(pair.firstStats, rest);
  storyNameUs(season, ch);
  Object.assign(state, snapB);
  season.ovr = teamOVR();
  return season;
}
```

- [ ] **Step 4: הרץ את הבדיקות**

Run: `node scripts/sim/story_test.js --season`
Expected: `22 passed`.

אם `identical first half` נכשל, הסיבה כמעט בוודאות היא ש-`simulate` קרא משהו מ-`state` שלא שוחזר ל-snapA. בדוק מה `myLineRatings` קורא (`state.tactic`, `state.picks`, `state.slots`, `state.coach`). **אל תחליש את הבדיקה.**

- [ ] **Step 5: Commit**

```bash
git add js/story-season.js scripts/sim/story_test_season.js
git commit -m "feat(story): a season in two halves from one seed, replayed after January

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: הווים והשערים ב-`game.js`, `january.js`, `cup.js`

כל שינוי כאן הוא `if (state.story)` שלא פועל כשהמוד כבוי. **ההוכחה:** `golden-v1 --check` נשאר זהה.

**Files:**
- Modify: `js/game.js`: `state` (שורה ~482), `oppTeamsForState` (~461), `beginDraftWithState` (~1225), `saveDraftState` (~1267), `restoreDraftState` (~1392), `animateResults` (~3287, ~3399, ~3629), `wireEuropeButton` (~3121), `setupSaveSection` (~4483), `restartGame` (~4335)
- Modify: `js/january.js:38`
- Modify: `js/cup.js:38`

- [ ] **Step 1: הרץ את ה-golden לפני השינוי, כבסיס**

Run: `node scripts/sim/golden-v1.js --check`
Expected: עובר בלי הבדלים. אם לא, **עצור** ודווח. זה אומר שהעץ כבר לא נקי.

- [ ] **Step 2: שדה `story` ב-`state`**

ב-`js/game.js`, באובייקט `state`, אחרי השורה של `challenge: null, challengeDeck: null, challengeReqs: null,`:

```js
  story: null,                                                 // { chapterId } while a מצב סיפור chapter is being played
```

- [ ] **Step 3: היריבות של הפרק**

ב-`oppTeamsForState`:

```js
function oppTeamsForState() {
  // A story chapter plays the real season WITHOUT your club in it, and with the
  // players you bought taken out of their squads (js/story-season.js).
  if (state.story && typeof storyOppForState === 'function') return storyOppForState();
  return simTeamsForSeason(state.oppSeason ?? LATEST_SEASON_YEAR, specForState().teams - 1);
}
```

- [ ] **Step 4: כל דראפט רגיל מנקה את המוד**

ב-`beginDraftWithState`, מיד אחרי `state.tactic  = tacticOf(style && style.tactic);`:

```js
  state.story   = null;       // every draft path goes through here; a chapter never does
```

ב-`restartGame`, בתוך ה-`Object.assign(state, {…})`, אחרי `career: null, …`:

```js
    story: null,           // "new game" leaves the chapter; the run itself stays in storage
```

- [ ] **Step 5: שמירה ושחזור**

ב-`saveDraftState`, אחרי `challengeReqs: state.challengeReqs || null,`:

```js
      story: state.story || null,
```

ב-`restoreDraftState`, בתוך ה-`Object.assign(state, {…})`, אחרי `challenge: d.challenge ?? null,`:

```js
    story: d.story ?? null,
```

- [ ] **Step 6: העונה והתפר ב-`animateResults`**

החלף את השורה

```js
    janPair = (typeof janPrepare === 'function') ? janPrepare(simulate) : null;
```

ב:

```js
    // A story chapter brings its own window: a whole market rather than one
    // gamble, replayed from one seed once it closes (js/story-season.js). It uses
    // the same seam, so the reveal below does not need to know which it is.
    janPair = (state.story && typeof storyPrepare === 'function') ? storyPrepare(simulate)
      : (typeof janPrepare === 'function') ? janPrepare(simulate) : null;
```

ב-`openSeam`, החלף את `janOpen(janPair, { wins: rw, draws: rd, losses: rl }, (chosen) => {` ב:

```js
      const opener = janPair.story ? storyOpen : janOpen;
      opener(janPair, { wins: rw, draws: rd, losses: rl }, (chosen) => {
```

(ה-`crRecordJanuary` שבתוך ה-callback כבר מוגן ב-`state.career`, ובפרק הוא תמיד `null`.)

- [ ] **Step 7: סוף העונה**

ב-`bindSeason`, מיד אחרי `if (!consequences) return;`:

```js
    // A chapter's season is judged against the real one, and nothing else about
    // it is an ordinary season: no career, no archive, no club records — the
    // squad was never yours to draft.
    if (state.story) {
      if (typeof storyOnSeasonEnd === 'function') {
        storyOnSeasonEnd({ rank: myRank, n: leagueTable.length, points: wins * 3 + draws,
                           gf: gfTotal, ga: gaTotal });
      }
      return;
    }
```

- [ ] **Step 8: לא לאירופה ולא ללוח הכללי**

ב-`wireEuropeButton`, בתחילת הפונקציה אחרי `if (!btn) return;`:

```js
  if (state.story) { btn.style.display = 'none'; return; }   // a chapter ends at its own verdict
```

ב-`setupSaveSection`, אחרי `if (!saveSection || !loginPrompt) return;`:

```js
  // A chapter is scored against its own start, not against free drafts.
  if (state.story) { saveSection.style.display = 'none'; loginPrompt.style.display = 'none'; return; }
```

- [ ] **Step 9: שערים ב-`january.js` וב-`cup.js`**

`js/january.js`, ב-`janEligible`: החלף

```js
    if (state.challenge || state.league || state.gauntlet) return false;
```

ב

```js
    if (state.challenge || state.league || state.gauntlet || state.story) return false;
```

`js/cup.js`, ב-`cupEligible`: אותה החלפה בדיוק.

- [ ] **Step 10: ודא שה-golden לא זז ושהבדיקות עוברות**

Run: `node scripts/sim/golden-v1.js --check && node scripts/sim/story_test.js --season`
Expected: ה-golden עובר בלי הבדלים, ואחריו `22 passed`.

- [ ] **Step 11: Commit**

```bash
git add js/game.js js/january.js js/cup.js
git commit -m "feat(story): hooks in the season reveal, gates everywhere a chapter must not reach

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: כיול, הבוט שקובע את התקציב

**Files:**
- Create: `scripts/sim/story_calibrate.js`
- Modify: `js/story-data.js` (הערך `budget` של `b7-2015`)

היעד מ-§7 במסמך, לרמה `normal`: ⭐ 30-45%, ⭐⭐ 10-20%, ⭐⭐⭐ 3-8%.

- [ ] **Step 1: כתוב את הבוט**

`scripts/sim/story_calibrate.js`:

```js
// scripts/sim/story_calibrate.js — how hard is a chapter, measured.
//
//   node scripts/sim/story_calibrate.js b7-2015 [runs=4000] [--sweep]
//
// A bot plays the chapter the way a GOOD player would: in summer it sells the
// bench for cash (never below the minimum squad) and spends on the upgrades
// that add most to the XI per shekel; in January it does the same with what is
// left, at January prices. It plays better than an average person, so the real
// mode is harder than these numbers — which is the intent (spec §7).
//
// --sweep runs the chapter at a range of budgets and prints a row per budget,
// so the budget in js/story-data.js is chosen from a table, not by feel.
const { load } = require('./story_test.js');
const G = load();

const id = process.argv[2] || 'b7-2015';
const N = parseInt(process.argv[3] || '4000', 10);
const SWEEP = process.argv.includes('--sweep');
const ch = G.storyChapter(id);
if (!ch) { console.log('no chapter ' + id); process.exit(1); }

const setUp = run => {
  Object.assign(G.state, { story: { chapterId: ch.id }, peakMode: false, classic: false,
    coach: null, oppSeason: parseInt(ch.season, 10), leagueFormat: 'authentic' });
  G.storyApplyXI(run);
};

function sellBench(run, priceOf) {
  const xi = new Set(G.storyBestXI(G.storyOwned(run), G.formationSlots(run.formationId, run.tactic))
    .filter(Boolean).map(e => e.squad.id + '|' + e.player.name));
  const bench = G.storyOwned(run).filter(e => !xi.has(e.squad.id + '|' + e.player.name))
    .sort((a, b) => priceOf(b) - priceOf(a));
  for (const e of bench) {
    if (run.own.length <= G.STORY_RULES.minSquad) break;
    G.storySell(run, e, G.storySellPrice(priceOf(e)));
  }
}

function buyUpgrades(run, priceFor) {
  for (;;) {
    const base = G.storyXiOvr(run);
    let best = null;
    // Only the top of the pool can move a strong XI; checking all ~350 is wasted time.
    const cands = G.storyMarketPool(run, ch).sort((a, b) => b.player.ovr - a.player.ovr).slice(0, 60);
    for (const e of cands) {
      const price = priceFor(e);
      if (price > run.budget) continue;
      run.own.push({ squadId: e.squad.id, name: e.player.name });
      const gain = G.storyXiOvr(run) - base;
      run.own.pop();
      if (gain > 0 && (!best || gain / Math.max(price, 0.5) > best.score)) {
        best = { e, price, score: gain / Math.max(price, 0.5) };
      }
    }
    if (!best || G.storyBuy(run, ch, best.e, best.price)) return;
  }
}

function playOnce(budget, seed) {
  const run = G.storyNewRun(ch, seed);
  run.budget = budget;
  const summerValue = e => G.storySummerValue(e.player, ch.season);
  sellBench(run, summerValue);
  buyUpgrades(run, e => G.storyBuyPrice(summerValue(e), G.storyIsRival(ch, e.squad.teamId)));

  run.phase = 'season';
  setUp(run);
  const pair = G.storySeasonPrepare(G.storySimulateFn(ch, run), run, ch);

  run.phase = 'jan';
  const statOf = name => pair.firstStats.find(s => s.name === name) || null;
  const janValue = e => G.storyJanValue(e.player, statOf(e.player.name));
  const before = JSON.stringify(run.own);
  sellBench(run, janValue);
  buyUpgrades(run, e => G.storyBuyPrice(G.storyValueOfOvr(e.player.ovr), G.storyIsRival(ch, e.squad.teamId)));
  const season = JSON.stringify(run.own) === before ? pair.stay : G.storySeasonResim(pair, run, ch);

  const pts = season.matches.reduce((s, m) => s + (m.outcome === 'W' ? 3 : m.outcome === 'D' ? 1 : 0), 0);
  const rank = season.leagueTable.findIndex(r => r.us) + 1;
  return G.storyStars(ch, { rank, points: pts, budget: run.budget });
}

function measure(budget) {
  const hit = [0, 0, 0];
  for (let i = 1; i <= N; i++) {
    const s = playOnce(budget, i * 2654435761 >>> 0);
    s.forEach((ok, k) => { if (ok) hit[k]++; });
  }
  return hit.map(h => (100 * h / N).toFixed(1) + '%');
}

console.log(`${ch.id} · ${ch.title} · level ${ch.level} · ${N} runs`);
const budgets = SWEEP ? [0, 2, 4, 6, 8, 10, 14, 20] : [ch.budget];
for (const b of budgets) {
  const [s1, s2, s3] = measure(b);
  console.log(`budget ${String(b).padStart(3)}  ⭐ ${s1.padStart(6)}  ⭐⭐ ${s2.padStart(6)}  ⭐⭐⭐ ${s3.padStart(6)}`);
}
```

- [ ] **Step 2: הרצה קצרה, לוודא שהבוט רץ**

Run: `node scripts/sim/story_calibrate.js b7-2015 200`
Expected: שורה אחת `budget   8  ⭐ …%  ⭐⭐ …%  ⭐⭐⭐ …%`, בלי קריסה.

- [ ] **Step 3: הסוויפ המלא**

Run: `node scripts/sim/story_calibrate.js b7-2015 4000 --sweep` (יכול לקחת כמה דקות, `timeout` 600000)
Expected: טבלה של 8 שורות.

- [ ] **Step 4: בחר תקציב**

בחר את התקציב **הנמוך ביותר** שבו ⭐ נמצא ב-30-45% ו-⭐⭐ ב-10-20%. אם ⭐⭐⭐ יוצא מחוץ ל-3-8%, שנה **רק את ⭐⭐⭐** (הסוג שלו או הסף), לא את התקציב.

**תנאי עצירה, חובה:** אם גם בתקציב 0 ⭐ **מעל 45%**, הפרק קל מדי מעצם הסגל, כי הבוט מממן רכישות ממכירת הספסל. **אל תמציא מנגנון.** עצור ודווח לבעלים עם הטבלה. האפשרויות שיעלו שם הן להעלות את `minSquad` בפרק הזה, להוריד את `sellRate`, או להקשיח את ⭐, וכולן החלטות שלו.

- [ ] **Step 5: עדכן את `budget` ב-`js/story-data.js` לערך שנבחר, והרץ פעם אחת בלי `--sweep` לאימות**

Run: `node scripts/sim/story_calibrate.js b7-2015 4000`
Expected: שלושת האחוזים בתוך הטווחים.

- [ ] **Step 6: Commit עם הטבלה בהודעה**

```bash
git add scripts/sim/story_calibrate.js js/story-data.js
git commit -m "feat(story): calibrate b7-2015 against the difficulty bands

<paste the sweep table here>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `story.js`, זרימה ושמירה

**Files:**
- Create: `js/story.js`

אין בדיקת Node לקובץ הזה, כי הוא תלוי ב-DOM וב-localStorage. הוא מאומת במסך ב-Task 7. לכן הוא נשמר דק: כל ההחלטות נמצאות בקבצים שכבר נבדקו.

- [ ] **Step 1: כתוב את `js/story.js`**

```js
/* ── מצב סיפור: the flow ──────────────────────────────────────────────────────
 *
 * Owns the run in localStorage and walks it through its phases:
 *   summer (the market screen) → season (the ordinary reveal, with our seam)
 *   → jan (the market again, over the reveal) → season → done (the verdict).
 * Every decision is made in js/story-market.js and js/story-season.js, which are
 * tested in Node; this file only moves between them. Screens are in
 * js/story-screens.js.
 *
 * No track() calls: 'story' is not yet on the allow-list track() enforces, and
 * an unknown mode is dropped in silence (scripts/check_track_contract.js).
 */
(function (global) {
  'use strict';

  const RUN_KEY = '36-0-story-run';
  const BEST_KEY = '36-0-story-best';
  let _run = null;

  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function storyRun() {
    if (!_run) {
      const r = load(RUN_KEY);
      _run = (r && r.v === 1 && storyChapter(r.chapterId)) ? r : null;
    }
    return _run;
  }
  function storySave() { if (_run) save(RUN_KEY, _run); }
  function storyBest() { return load(BEST_KEY) || {}; }

  function storyStart(chapterId) {
    const ch = storyChapter(chapterId);
    if (!ch) return;
    _run = storyNewRun(ch, (Math.random() * 4294967296) >>> 0);
    storySave();
    // A draft or season left in storage belongs to some other mode.
    if (typeof clearDraftState === 'function') clearDraftState();
    storyShowMarket('summer');
  }

  // From the summer market to the ordinary pre-season screen, with the chapter's
  // XI on the pitch and every other mode's field explicitly switched off —
  // `state` is shared, and a field nobody sets is a field that carries over.
  function storyEnterSeason() {
    const run = storyRun();
    const ch = run && storyChapter(run.chapterId);
    if (!ch) return;
    run.phase = 'season';
    storySave();
    const year = parseInt(ch.season, 10);
    Object.assign(state, {
      story: { chapterId: ch.id },
      challenge: null, challengeDeck: null, challengeReqs: null,
      leagueCode: null, duelCode: null, career: null, gauntlet: null,
      salaryCap: false, deck: null, mgw: null,
      classic: false, peakMode: false, showRatings: true, difficulty: 'normal',
      coach: null, coachOn: false, januaryOn: false,       // managers arrive in phase 2
      oppSeason: year, oppSeasonChoice: 'latest', leagueFormat: 'authentic',
      usedSquadIds: new Set(), currentSquad: null,
      selectedPlayer: null, selectedSlotIdx: null,
      isAnimating: false, awaitingSlotPick: false, moveMode: false, movingFromIdx: null,
    });
    storyApplyXI(run);
    state.usedPlayerKeys = new Set(state.picks.filter(Boolean).map(p => p.player.name));
    state.currentRound = state.slots.length;               // "drafted" — restore resumes at the season
    saveDraftState();
    showPreseason(teamOVR());
  }

  // Called by oppTeamsForState() while a chapter is on.
  function storyOppForState() {
    const run = storyRun();
    const ch = run && storyChapter(run.chapterId);
    return ch ? storyOppForSim(ch, run) : [];
  }

  // Called by animateResults when a chapter's season is simulated.
  function storyPrepare(simulate) {
    const run = storyRun();
    const ch = run && storyChapter(run.chapterId);
    if (!ch || !state.story) return null;
    return storySeasonPrepare(simulate, run, ch);
  }

  // Called by the reveal at the seam. The market works on a COPY of the run and
  // commits only on confirm, so a refresh in the middle of it loses nothing but
  // the unconfirmed moves (and the season continues as `stay`, like january.js).
  function storyOpen(pair, tally, onChosen) {
    const run = storyRun();
    const ch = storyChapter(run.chapterId);
    run.phase = 'jan';
    storySave();
    const draft = JSON.parse(JSON.stringify(run));
    storyShowJanuary(pair, tally, draft, () => {
      const changed = JSON.stringify([draft.own, draft.formationId, draft.tactic]) !==
                      JSON.stringify([run.own, run.formationId, run.tactic]);
      Object.assign(run, draft, { phase: 'season' });
      storySave();
      if (!changed) { onChosen(pair.stay); return; }
      const season = storySeasonResim(pair, run, ch);
      saveDraftState();
      if (typeof buildResultsPitch === 'function') buildResultsPitch();
      onChosen(season);
    });
  }

  // Called from bindSeason. Runs again for a restored season, so it is idempotent:
  // the verdict is written once, and only re-rendered after that.
  function storyOnSeasonEnd(res) {
    const run = storyRun();
    const ch = run && storyChapter(run.chapterId);
    if (!ch) return;
    if (run.phase !== 'done') {
      const r = { rank: res.rank, points: res.points, budget: run.budget };
      const stars = storyStars(ch, r);
      run.result = { ...r, stars, score: storyScore(ch, r) };
      run.phase = 'done';
      storySave();
      const best = storyBest();
      const b = best[ch.id] || { stars: [false, false, false], score: null };
      best[ch.id] = {
        stars: b.stars.map((s, i) => s || stars[i]),
        score: b.score == null ? run.result.score : Math.max(b.score, run.result.score),
      };
      save(BEST_KEY, best);
    }
    storyRenderEnd(ch, run.result);
  }

  function storyExit() {
    if (typeof clearDraftState === 'function') clearDraftState();
    state.story = null;
    storyShowHub();
  }

  Object.assign(global, {
    storyRun, storySave, storyBest, storyStart, storyEnterSeason, storyOppForState,
    storyPrepare, storyOpen, storyOnSeasonEnd, storyExit,
  });
})(typeof window !== 'undefined' ? window : globalThis);
```

**שים לב:** `game.js` קורא ל-`storyPrepare`, `storyOpen`, `storyOnSeasonEnd` ו-`storyOppForState` כשמות חשופים. בדפדפן `window.x` הוא גלובלי, וזה בדיוק הדפוס של `janOpen`.

- [ ] **Step 2: בדיקת תחביר**

Run: `node --check js/story.js`
Expected: בלי פלט.

- [ ] **Step 3: Commit**

```bash
git add js/story.js
git commit -m "feat(story): the chapter flow and its storage

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: המסכים

**Files:**
- Create: `js/story-screens.js`

פלטה כהה בלבד, רק עם ה-tokens הקיימים (`--panel`, `--surface`, `--border`, `--text`, `--dim`, `--accent`, `--accent-ink`, `--hover`, `--radius`). ראו [[feature-taste-36-0]]: הבעלים דחה שלוש פעמים משטחים לבהירים. **אסור שום רקע לבן.**

- [ ] **Step 1: כתוב את `js/story-screens.js`**

```js
/* ── מצב סיפור: screens ───────────────────────────────────────────────────────
 *
 * Four things, all rendered into existing surfaces:
 *   · the hub — the chapter cards (screen-story)
 *   · the market — the same renderer for summer (screen-story) and January (an
 *     overlay over the reveal, the way js/january.js opens its window)
 *   · the verdict — a box on the results screen (#story-end-box)
 * Colours come from the app's tokens only. This is a #0d1117 app.
 */
(function (global) {
  'use strict';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = n => `₪${(Math.round(n * 10) / 10).toFixed(1)}מ׳`;
  const clubName = id => (typeof TEAMS !== 'undefined' && TEAMS[id] && TEAMS[id].name) || id;
  const posHe = p => (typeof POS_HE !== 'undefined' && POS_HE[p]) || p;

  function ensureStyle() {
    if (document.getElementById('story-style')) return;
    const s = document.createElement('style');
    s.id = 'story-style';
    s.textContent = `
.st-cards{display:grid;gap:12px}
.st-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  padding:16px;text-align:right;color:var(--text);font-family:inherit;cursor:pointer;width:100%}
.st-card:hover{background:var(--hover)}
.st-card h3{margin:0 0 4px;font-size:18px}
.st-card .st-meta{color:var(--dim);font-size:13px}
.st-stars{color:var(--accent);letter-spacing:2px;font-size:16px}
.st-stars .off{color:var(--border)}
.st-intro{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  padding:16px;margin:0 0 14px;line-height:1.7}
.st-goals{margin:10px 0 0;padding:0;list-style:none;font-size:14px}
.st-goals li{margin:3px 0}
.st-bar{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
.st-chip{flex:1;min-width:92px;background:var(--surface);border:1px solid var(--border);
  border-radius:9px;padding:8px;text-align:center}
.st-chip i{display:block;font-style:normal;font-size:11px;color:var(--dim)}
.st-chip b{font-size:18px}
.st-row{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}
.st-row select,.st-row input{flex:1;min-width:120px;background:var(--surface);color:var(--text);
  border:1px solid var(--border);border-radius:8px;padding:8px;font-family:inherit}
.st-h{font-size:14px;color:var(--dim);margin:14px 0 6px}
.st-list{display:flex;flex-direction:column;gap:6px}
.st-p{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);
  border-radius:9px;padding:8px 10px}
.st-p.xi{border-color:var(--accent)}
.st-p .n{flex:1;min-width:0}
.st-p .n b{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.st-p .n em{font-style:normal;font-size:12px;color:var(--dim)}
.st-p .o{font-weight:700;font-size:17px;width:30px;text-align:center}
.st-b{background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:8px;
  padding:7px 10px;font-family:inherit;font-size:13px;cursor:pointer;white-space:nowrap}
.st-b:hover{background:var(--hover)}
.st-b.go{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-weight:700}
.st-b[disabled]{opacity:.45;cursor:default}
.st-msg{min-height:20px;color:var(--accent);font-size:13px;margin:6px 0}
.st-go{width:100%;padding:13px;font-size:16px;margin:14px 0 4px}
.st-wrap{position:fixed;inset:0;z-index:9000;overflow-y:auto;background:rgba(0,0,0,.78);padding:16px}
.st-box{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);
  max-width:560px;margin:0 auto;padding:18px}
.st-end{background:var(--surface);border:1px solid var(--accent);border-radius:var(--radius);
  padding:16px;margin:14px 0;text-align:center}
.st-end .st-stars{font-size:28px}
.st-vs{display:flex;gap:8px;margin:12px 0}
.st-vs div{flex:1;background:var(--panel);border:1px solid var(--border);border-radius:9px;padding:8px}
.st-vs i{display:block;font-style:normal;font-size:11px;color:var(--dim)}
`;
    document.head.appendChild(s);
  }

  function starsHTML(arr) {
    return `<span class="st-stars">${[0, 1, 2].map(i =>
      `<span class="${arr && arr[i] ? '' : 'off'}">★</span>`).join('')}</span>`;
  }
  function root() { return document.getElementById('story-root'); }

  /* ── the hub ─────────────────────────────────────────────────────────────── */
  function storyShowHub() {
    ensureStyle();
    showScreen('story');
    const back = document.getElementById('story-back');
    if (back) back.onclick = () => showScreen('setup');
    const best = storyBest();
    const run = storyRun();
    root().innerHTML = `
      <p class="st-meta" style="color:var(--dim);margin:0 0 14px">רגעים אמיתיים מתולדות ליגת העל.
        אתה המועדון, עם הסגל והקופה של אותה עונה. תגיע למטרה, ואז תנסה לעקוף את המציאות.</p>
      <div class="st-cards">${STORY_CHAPTERS.map(ch => {
        const real = storyReal(ch);
        const b = best[ch.id];
        const live = run && run.chapterId === ch.id && run.phase !== 'done';
        return `<button class="st-card" data-ch="${ch.id}">
          <h3>${esc(clubName(ch.teamId))} ${esc(ch.season)}: ${esc(ch.title)}</h3>
          <div class="st-meta">במציאות: מקום ${real ? real.pos : '?'}, ${real ? real.pts : '?'} נק׳
            ${b ? ` · השיא שלך: ${b.score}` : ''}${live ? ' · <b style="color:var(--accent)">בתהליך</b>' : ''}</div>
          ${starsHTML(b && b.stars)}
        </button>`;
      }).join('')}</div>`;
    root().querySelectorAll('.st-card').forEach(el => {
      el.onclick = () => storyShowIntro(el.dataset.ch);
    });
  }

  function storyShowIntro(chId) {
    const ch = storyChapter(chId);
    const run = storyRun();
    const live = run && run.chapterId === ch.id && run.phase === 'summer';
    const real = storyReal(ch);
    root().innerHTML = `
      <div class="st-intro">
        <h3 style="margin:0 0 8px">${esc(clubName(ch.teamId))} ${esc(ch.season)}: ${esc(ch.title)}</h3>
        <p style="margin:0">${esc(ch.intro)}</p>
        <ul class="st-goals">${ch.stars.map((s, i) =>
          `<li>${'★'.repeat(i + 1)} ${esc(s.label)}${s.type === 'beatPoints' && real ? ` (${real.pts})` : ''}</li>`).join('')}</ul>
        <p class="st-meta" style="color:var(--dim);margin:10px 0 0">תקציב פתיחה: ${money(ch.budget)} ·
          עד ${STORY_RULES.buys.summer} רכישות בקיץ ו-${STORY_RULES.buys.jan} בינואר</p>
      </div>
      <button class="st-b go st-go" id="st-begin">${live ? 'להמשיך את הקיץ' : 'להתחיל את הפרק'}</button>
      <button class="st-b st-go" id="st-hub">חזרה לפרקים</button>`;
    document.getElementById('st-begin').onclick = () => live ? storyShowMarket('summer') : storyStart(ch.id);
    document.getElementById('st-hub').onclick = storyShowHub;
  }

  /* ── the market (both windows) ───────────────────────────────────────────── */
  // ctx: { run, ch, window: 'summer'|'jan', statOf(name) → stats|null, host, onDone }
  function renderMarket(ctx) {
    const { run, ch } = ctx;
    const jan = ctx.window === 'jan';
    const valueOf = e => jan
      ? (e.squad.teamId === ch.teamId || run.own.some(r => r.squadId === e.squad.id && r.name === e.player.name)
          ? storyJanValue(e.player, ctx.statOf(e.player.name))
          : storyValueOfOvr(e.player.ovr))
      : storySummerValue(e.player, ch.season);
    const xiNames = new Set(storyBestXI(storyOwned(run), formationSlots(run.formationId, run.tactic))
      .filter(Boolean).map(e => e.player.name));
    const owned = storyOwned(run).sort((a, b) => b.player.ovr - a.player.ovr);
    const q = (ctx.q || '').trim();
    const pos = ctx.pos || '';
    const pool = storyMarketPool(run, ch)
      .filter(e => (!q || e.player.name.includes(q) || clubName(e.squad.teamId).includes(q)) &&
                   (!pos || e.player.position === pos))
      .sort((a, b) => b.player.ovr - a.player.ovr).slice(0, 40);
    const left = STORY_RULES.buys[ctx.window] - run.buys[ctx.window];
    const tactical = formationTactical(run.formationId);
    const positions = [...new Set(storyMarketPool(run, ch).map(e => e.player.position))].sort();

    ctx.host.innerHTML = `
      <p class="jan-kicker" style="color:var(--accent);margin:0 0 6px;font-weight:600">
        ${jan ? 'חלון ההעברות של ינואר' : 'חלון ההעברות של הקיץ'} · ${esc(clubName(ch.teamId))} ${esc(ch.season)}</p>
      ${jan ? `<p style="margin:0 0 10px;color:var(--dim);font-size:13px">המחירים של השחקנים שלך
        מתעדכנים לפי מה שעשו בחצי העונה.</p>` : ''}
      <div class="st-bar">
        <div class="st-chip"><i>תקציב</i><b dir="ltr">${money(run.budget)}</b></div>
        <div class="st-chip"><i>רכישות שנשארו</i><b>${left}</b></div>
        <div class="st-chip"><i>סגל</i><b>${run.own.length}</b></div>
        <div class="st-chip"><i>דירוג ההרכב</i><b>${storyXiOvr(run)}</b></div>
      </div>
      <div class="st-row">
        <select id="st-form">${Object.keys(FORMATIONS).map(k =>
          `<option value="${k}"${k === run.formationId ? ' selected' : ''}>${esc(FORMATIONS[k].label)}</option>`).join('')}</select>
        <select id="st-tac"${tactical ? '' : ' disabled'}>${TACTIC_KEYS.map(k =>
          `<option value="${k}"${k === run.tactic ? ' selected' : ''}>${esc(TACTICS[k].label)}</option>`).join('')}</select>
      </div>
      <div class="st-msg" id="st-msg">${esc(ctx.msg || '')}</div>
      <div class="st-h">הסגל שלך. ההרכב (במסגרת צהובה) נבחר אוטומטית מהטובים לכל עמדה</div>
      <div class="st-list">${owned.map((e, i) => {
        const price = storySellPrice(valueOf(e));
        const st = jan ? ctx.statOf(e.player.name) : null;
        const line = st ? ` · ${st.goals} ש׳ ${st.assists} ב׳${st.cs ? ` ${st.cs} נקיים` : ''}` : '';
        return `<div class="st-p${xiNames.has(e.player.name) ? ' xi' : ''}">
          <span class="o">${e.player.ovr}</span>
          <span class="n"><b>${esc(e.player.name)}</b><em>${esc(posHe(e.player.position))}${line}</em></span>
          <button class="st-b" data-sell="${i}">מכור ${money(price)}</button></div>`;
      }).join('')}</div>
      <div class="st-h">השוק</div>
      <div class="st-row">
        <input id="st-q" placeholder="חיפוש שחקן או מועדון" value="${esc(q)}">
        <select id="st-pos"><option value="">כל העמדות</option>${positions.map(p =>
          `<option value="${p}"${p === pos ? ' selected' : ''}>${esc(posHe(p))}</option>`).join('')}</select>
      </div>
      <div class="st-list">${pool.map((e, i) => {
        const rival = storyIsRival(ch, e.squad.teamId);
        const price = storyBuyPrice(valueOf(e), rival);
        const can = left > 0 && price <= run.budget + 1e-9;
        return `<div class="st-p">
          <span class="o">${e.player.ovr}</span>
          <span class="n"><b>${esc(e.player.name)}</b><em>${esc(posHe(e.player.position))} ·
            ${esc(clubName(e.squad.teamId))}${rival ? ' · יריבה +50%' : ''}</em></span>
          <button class="st-b" data-buy="${i}"${can ? '' : ' disabled'}>קנה ${money(price)}</button></div>`;
      }).join('')}</div>
      <button class="st-b go st-go" id="st-done">${jan ? 'להמשיך את העונה' : 'לפתיחת העונה'}</button>`;

    const redraw = msg => renderMarket({ ...ctx, msg });
    ctx.host.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => {
      const e = owned[+b.dataset.sell];
      const why = storySell(run, e, storySellPrice(valueOf(e)));
      if (!why && ctx.persist) ctx.persist();
      redraw(why || `${e.player.name} נמכר`);
    });
    ctx.host.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const e = pool[+b.dataset.buy];
      const why = storyBuy(run, ch, e, storyBuyPrice(valueOf(e), storyIsRival(ch, e.squad.teamId)));
      if (!why && ctx.persist) ctx.persist();
      redraw(why || `${e.player.name} הצטרף`);
    });
    document.getElementById('st-form').onchange = ev => {
      run.formationId = ev.target.value;
      if (!formationTactical(run.formationId)) run.tactic = 'bal';
      if (ctx.persist) ctx.persist();
      redraw('');
    };
    document.getElementById('st-tac').onchange = ev => {
      run.tactic = ev.target.value;
      if (ctx.persist) ctx.persist();
      redraw('');
    };
    const qEl = document.getElementById('st-q');
    qEl.onchange = () => renderMarket({ ...ctx, q: qEl.value, msg: '' });
    document.getElementById('st-pos').onchange = ev => renderMarket({ ...ctx, pos: ev.target.value, msg: '' });
    document.getElementById('st-done').onclick = ctx.onDone;
  }

  function storyShowMarket() {
    ensureStyle();
    const run = storyRun();
    const ch = run && storyChapter(run.chapterId);
    if (!ch) { storyShowHub(); return; }
    showScreen('story');
    renderMarket({ run, ch, window: 'summer', statOf: () => null, host: root(),
                   persist: storySave, onDone: storyEnterSeason });
  }

  function storyShowJanuary(pair, tally, draft, onDone) {
    ensureStyle();
    const ch = storyChapter(draft.chapterId);
    const wrap = document.createElement('div');
    wrap.className = 'st-wrap';
    const pts = tally.wins * 3 + tally.draws;
    wrap.innerHTML = `<div class="st-box" role="dialog" aria-modal="true">
      <p style="margin:0 0 10px;color:var(--dim);font-size:13px">חצי הדרך:
        <b dir="ltr" style="color:var(--text)">${tally.wins}-${tally.draws}-${tally.losses}</b>,
        ${pts} נק׳ אחרי ${pair.played} מחזורים</p>
      <div id="st-jan"></div></div>`;
    document.body.appendChild(wrap);
    const statOf = name => pair.firstStats.find(s => s.name === name) || null;
    renderMarket({ run: draft, ch, window: 'jan', statOf, host: wrap.querySelector('#st-jan'),
                   onDone: () => { wrap.remove(); onDone(); } });
  }

  /* ── the verdict ─────────────────────────────────────────────────────────── */
  function storyRenderEnd(ch, r) {
    ensureStyle();
    const box = document.getElementById('story-end-box');
    if (!box || !r) return;
    const real = storyReal(ch);
    const best = storyBest()[ch.id];
    box.innerHTML = `<div class="st-end">
      <p style="margin:0 0 4px;color:var(--dim);font-size:13px">${esc(clubName(ch.teamId))} ${esc(ch.season)}: ${esc(ch.title)}</p>
      ${starsHTML(r.stars)}
      <ul class="st-goals" style="text-align:right">${ch.stars.map((s, i) =>
        `<li>${r.stars[i] ? '✅' : '❌'} ${esc(s.label)}</li>`).join('')}</ul>
      <div class="st-vs">
        <div><i>אתם</i><b>מקום ${r.rank} · ${r.points} נק׳</b></div>
        <div><i>המציאות</i><b>מקום ${real ? real.pos : '?'} · ${real ? real.pts : '?'} נק׳</b></div>
      </div>
      <p style="margin:0 0 4px">תקציב בסוף: <b dir="ltr">${money(r.budget)}</b> (פתיחה: ${money(ch.budget)})</p>
      <p style="margin:0 0 12px">ניקוד: <b>${r.score}</b>${best ? ` · השיא שלך: <b>${best.score}</b>` : ''}</p>
      <div style="display:flex;gap:8px">
        <button class="st-b go" id="st-again" style="flex:1">לשחק שוב</button>
        <button class="st-b" id="st-chapters" style="flex:1">לפרקים</button>
      </div></div>`;
    document.getElementById('st-again').onclick = () => storyStart(ch.id);
    document.getElementById('st-chapters').onclick = storyExit;
  }

  // Any season that is NOT a chapter must not show the last chapter's verdict.
  function storyClearEnd() {
    const box = document.getElementById('story-end-box');
    if (box) box.innerHTML = '';
  }

  Object.assign(global, { storyShowHub, storyShowIntro, storyShowMarket, storyShowJanuary,
                          storyRenderEnd, storyClearEnd });
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 2: נקה את תיבת הסיום בכל עונה שאינה פרק**

ב-`js/game.js`, ב-`showResults`, מיד אחרי `if (typeof crowdXiTipClear === 'function') crowdXiTipClear();`:

```js
  if (typeof storyClearEnd === 'function') storyClearEnd();
```

(אחרי זה `bindSeason` מצייר את התיבה מחדש אם העונה היא פרק. זה אותו דפוס בדיוק כמו `crowdXiTipClear`.)

- [ ] **Step 3: בדיקת תחביר**

Run: `node --check js/story-screens.js && node --check js/game.js`
Expected: בלי פלט.

- [ ] **Step 4: Commit**

```bash
git add js/story-screens.js js/game.js
git commit -m "feat(story): the chapter hub, both transfer windows and the verdict

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: חיווט ב-`index.html` ואימות במסך האמיתי

**Files:**
- Modify: `index.html`

- [ ] **Step 1: כרטיס במסך ההגדרות**

ב-`index.html`, מיד אחרי ה-`</button>` שסוגר את `setup-career-card`:

```html
      <button class="setup-mode-card" id="setup-story-card">
        <span class="smc-icon">📖</span>
        <span class="smc-body">
          <span class="smc-title">מצב סיפור <span class="smc-new">חדש</span></span>
          <span class="smc-sub">עונות אמיתיות מההיסטוריה. הסגל והקופה של אז, ואתה מנסה לעקוף את המציאות</span>
        </span>
        <span class="smc-arrow">←</span>
      </button>
```

- [ ] **Step 2: המסך**

מיד לפני `<!-- ══ MINI GAMES`:

```html
  <!-- ══ STORY (js/story.js, js/story-screens.js) ═════════════════════════════ -->
  <div id="screen-story" class="screen screen-page">
    <div class="page-inner">
      <div class="page-header">
        <button class="back-btn" id="story-back">→ חזרה</button>
        <h2 class="page-title">📖 מצב סיפור</h2>
      </div>
      <div id="story-root"></div>
    </div>
  </div>

```

- [ ] **Step 3: תיבת הסיום במסך התוצאות**

מיד לפני `<div id="clr-broken-box"></div>`:

```html
        <!-- A story chapter's verdict (js/story-screens.js). Empty outside a chapter. -->
        <div id="story-end-box"></div>
```

- [ ] **Step 4: הסקריפטים**

מיד אחרי `<script src="js/coach.js?v=…"></script>`, כלומר אחרי `game.js`, `league-sim.js` ו-`january.js`:

```html
  <script src="js/story-data.js"></script>
  <script src="js/story-market.js"></script>
  <script src="js/story-season.js"></script>
  <script src="js/story.js"></script>
  <script src="js/story-screens.js"></script>
```

- [ ] **Step 5: חבר את הכרטיס**

בסוף `js/story-screens.js`, לפני ה-`})(…)` שסוגר את הקובץ:

```js
  document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('setup-story-card');
    if (card) card.addEventListener('click', storyShowHub);
  });
```

- [ ] **Step 6: חתימת גרסאות לנכסים**

Run: `node scripts/stamp_assets.js`
Expected: חמשת הסקריפטים החדשים מקבלים `?v=<hash>`, ו-`game.js`, `january.js` ו-`cup.js` מקבלים hash חדש.

- [ ] **Step 7: אמת במסך האמיתי, לפי ה-verify skill**

הפעל את ה-skill `verify`, והקפד על מה שכתוב ב-[[verify-headless-gotchas]]: **צילומי המסך הם האמת**, ולא `getComputedStyle`. מסלול לבדיקה:
1. הגדרות → "מצב סיפור": כרטיס אחד, במציאות "מקום 1, 83 נק׳". 📸
2. פתיחה → מטרות ותקציב → "להתחיל את הפרק".
3. בשוק: מכור שחקן ספסל (התקציב עולה, הסגל יורד), קנה שחקן (התקציב יורד, "רכישות שנשארו" יורד, הדירוג מתעדכן), שנה מערך. 📸
4. "לפתיחת העונה" → מסך הפרה-סיזון עם 11 שחקנים של ב"ש → סימולציה.
5. הגילוי נעצר בתפר → חלון ינואר נפתח **כשכבה כהה**, עם שערים ובישולים ליד השחקנים. 📸
6. קנה שחקן → "להמשיך את העונה" → הגילוי ממשיך, והטבלה מציגה "הפועל באר שבע" ולא "הקבוצה שלי".
7. סוף: תיבת הסיום עם כוכבים, "אתם" מול "המציאות", תקציב וניקוד. כפתור אירופה **מוסתר**, וקטע השמירה **מוסתר**. 📸
8. **ריענון דף** על מסך התוצאות: אותה עונה ואותה תיבה, והשיא לא נספר פעמיים.
9. "לפרקים" → הכרטיס מראה כוכבים ושיא.
10. **רגרסיה:** "משחק חדש" → דראפט רגיל מההגדרות → עונה מלאה. אין תיבת סיפור, ינואר הרגיל נפתח (אם מופעל), כפתור אירופה חוזר.

כל חריגה נכנסת ל-**systematic-debugging**, ולא לתיקון מהיר.

- [ ] **Step 8: הרצה אחרונה של כל הבדיקות**

Run: `node scripts/sim/golden-v1.js --check && node scripts/sim/story_test.js --season && node scripts/check_track_contract.js`
Expected: הכול עובר.

- [ ] **Step 9: Commit**

```bash
git add index.html js/*.js
git commit -m "feat(story): מצב סיפור on the setup screen — one chapter, end to end

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 10: העלאה לאוויר, רק באישור מפורש של הבעלים**

לפי [[deploy-checklist]]: push ל-main ואימות ב-URL החי. **לפני ה-push שואלים את הבעלים**, כי זו פעולה חיצונית. אחרי ה-push חוזרים על צעדים 1-7 מ-Step 7 מול האתר החי.

---

## אחרי שלב 1

- עדכון זיכרון `story-mode`: מה נבנה, התקציב שנקבע ומה הסוויפ הראה.
- תוכנית לשלב 2 (מאמנים, ציר זמן, חוזים ובונוסים, והרכב ידני) נכתבת רק אחרי שהבעלים שיחק בשלב 1.
