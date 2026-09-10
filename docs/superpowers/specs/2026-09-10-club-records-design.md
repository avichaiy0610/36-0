# בית המועדון — שיאי כל הזמנים והארון שלובש את הסמל

**Status:** approved 2026-09-10. Build without pushing.

Two features that turned out to be one: club all-time records that get broken
(#5), and the trophy cabinet wearing the player's own crest and name (#6). They
share a screen, so they share a spec.

## Why

The club shipped in v1.56 as pure identity — a name, a crest, a kit, carried
onto eleven screens. It renames things and nothing more. Meanwhile a career's
cabinet aggregates every dynasty this device has finished, and an ordinary
season leaves no trace at all: you play it, you read the table, it is gone.

What the research on career and franchise modes says people actually keep coming
back for is the cumulative layer — an honours board, season-by-season finishes,
and all-time records that YOUR players break. FM26 buried its club-history
screen and the community has not stopped complaining; every third-party career
tracker rebuilds the same three things.

So: the club stops being a label and starts being a record.

## Decisions already made (do not re-litigate)

| Question | Answer |
|---|---|
| Whose records? | The CLUB's, across every career and season ever played with it. Never reset. |
| Which seasons count? | Free play + career. |
| Which do NOT count? | Challenges, leagues, duels, gauntlet, salary cap, mini-games. |
| What is recorded? | Player records, team season records, a "record broken" moment, and an all-time XI. |
| Where does it live? | A new screen reached from the club card on the setup screen. |

## The screen — בית המועדון

One new screen, four blocks, top to bottom:

1. **Header** — the crest at a real size, the club name, the city, and a single
   line of totals: seasons played, careers finished, titles.
2. **ארון התארים** — the existing `crHonoursHTML(null, {counts, sub, title})`
   with the lifetime counts. Not a copy: the same function, called with the same
   options `crSetupHonoursHTML()` already uses. This is feature #6 — the cabinet
   in a room that carries your crest instead of on the career setup screen alone.
3. **שיאי המועדון** — the records, below.
4. **האחד עשר של כל הזמנים** — eleven shirts in the club's own kit and numbers,
   drawn with the existing `clubShirtSVG`.

A player with no club sees the entry point but the screen explains itself and
offers the editor. A player with a club and no seasons sees empty shelves and
empty records — deliberately, the same way the cabinet already draws the shelves
it has not filled.

## The records

**Player records** (per player, matched on a normalised name):

| Record | Source |
|---|---|
| מלך השערים של כל הזמנים | sum of `playerStats[].goals` |
| מלך הבישולים | sum of `playerStats[].assists` |
| אגדת המועדון — הכי הרבה עונות | count of seasons the name appears in |
| הכי הרבה שערים בעונה אחת | max single-season goals, with the season it happened |

**Team season records:**

| Record | Source |
|---|---|
| הכי הרבה נקודות בעונה | `wins*3 + draws` |
| הכי הרבה שערים | `gfTotal` |
| הכי מעט ספיגות | `gaTotal` |
| הניצחון הגדול ביותר | `calcHighlights(matches).bigWin` |

Every team record stores the season it was set in, so the screen can say when.

## The all-time XI

One player per slot of a 4-3-3, chosen by the rating he had **in the season he
played for you** (`playerStats[].ovr`), ties broken by goals + assists. Slot is
`playerStats[].slotPos`, which is the slot he actually filled, not his card
position — a striker played at RW belongs on the wing of the XI he played on.

Stored as eleven `{name, ovr, pos, year}` entries, recomputed on every season
that beats a slot. Rendered with `clubShirtSVG` + `clubNumbersFor`, which
already exist for the team photo.

## Where it is written

**In `bindSeason()`'s consequences block in `js/game.js`, beside `daRecord`.**

This is the seam the codebase already treats as "a season has really ended": it
is gated on `consequences`, which is false while a January window is still
pending (the season on screen is provisional until the door is chosen), and it
is where `crOnSeasonEnd`, `daRecord` and `mgwOnSeasonEnd` are already called.
`playerStats` and `matches` are both destructured into scope at the top of it.

`fillResults` was the first candidate and is the wrong one: it runs for a
provisional season too.

### The guard: reuse `daMode()`, do not write a second one

`js/draft-archive.js` already owns the question "what kind of run produced this
season", and answers it in one place:

```js
function daMode() {
  if (state.career)     return null;        // the career keeps its own archive
  if (state.gauntlet)   return 'gauntlet';
  if (state.leagueCode) return 'league';
  if (state.duelCode)   return 'duel';
  if (state.challenge)  return 'challenge';
  if (state.mgw)        return 'wordle';
  if (salActive())      return 'salary';
  return 'draft';
}
```

A season counts for the club iff `clubHas()` **and** it is either a career
(`state.career`) or `daMode() === 'draft'`. Every excluded mode is excluded by
the detector that already exists, which is the whole point: this project's most
repeated bug is "a field nobody sets is a field that carries over", and the
lesson written down after the third occurrence was to put the guard where the
field is READ. A second, parallel list of modes would be a fourth occurrence
waiting to happen — one list, one reader.

**One hole to close first, and it is a live bug in the archive:** the auction
(`js/mg-auction.js`) nulls out `leagueCode`/`duelCode`/`gauntlet`/`career`/`mgw`
and sets no flag of its own, so `daMode()` already returns `'draft'` for an
auction season — the draft archive has been mislabelling them, and the club
records would have counted them. `DA_MODE_HE` even carries an `auction` label
that nothing can produce. Fix: the auction sets `state.mga = { … }` where it
starts, `daMode()` returns `'auction'` for it, and `startGame`/`crStartDraft`
clear it beside `state.mgw`.

### Idempotency

The reveal replays: a restored season re-enters this block, and the code says so
in its own comments. Counting a season twice would inflate a record permanently
and silently.

`daRecord` already solves this and its key is reused verbatim in shape:
`mode | the eleven names | points`. The ledger stores the last key it counted
and ignores a repeat. Two genuinely different seasons cannot collide; two
identical ones are the same season twice.

## The data

`localStorage`, key `36-0-club-recs`, beside `36-0-club`. Same reasoning as
`js/club.js`: it must survive offline and it is nobody else's business. The
published copy on `profiles.club` (migration `20260910000001`) is a precedent
for putting it on the server later; nothing here blocks that.

```js
{
  v: 1,
  club: 'הפועל ירוחם',      // whose records these are — see below
  seasons: 0,
  lastKey: null,
  players: {                 // keyed by normalised name
    '<norm>': { name, goals, assists, seasons, bestGoals: { n, year } }
  },
  team: {
    points:  { n, year }, gf: { n, year },
    ga:      { n, year },                     // fewest, only set once a season ends
    bigWin:  { gf, ga, opponent, year }
  },
  xi: [ { slot, name, ovr, year } ]           // eleven, sparse until filled
}
```

**Renaming the club does not reset the records** — the ledger is the device's,
and `club` is stored only so the screen can say "השיאים נקבעו כשנקראת X" if the
name changed. Wiping records is available in the club editor, never automatic:
a player who renames a club has not founded a new one.

## The moment a record falls

`fillResults` compares before and after and returns the list of records broken.
The season-end screen shows them as lines under the awards, in the same voice as
מלך השערים already there:

> 🏆 **שיא חדש** — אלון מזרחי, 31 שערים בעונה. הקודם: 28.

At most three lines; a first season sets every record at once and a screen that
announces eleven of them announces nothing.

## Files

| File | Change |
|---|---|
| `js/club-records.js` | new — the ledger, the comparison, the screen |
| `css/club.css` | the records screen and the XI |
| `js/game.js` | one call in `bindSeason`'s consequences block; the broken-record lines on the results screen; clear `state.mga` in `startGame` |
| `js/draft-archive.js` | `daMode()` learns `'auction'` |
| `js/mg-auction.js` | sets `state.mga` |
| `js/career.js` | clears `state.mga` beside `state.mgw` |
| `js/club.js` | the entry point on the club card; wipe in the editor |
| `index.html` | the screen container + the new script |

## Explicitly out of scope

- No leaderboard, no Supabase table, no cross-device sync in this version.
- No per-match records (longest streak is already on the results screen).
- Not counted: every mode listed in the decisions table above.
