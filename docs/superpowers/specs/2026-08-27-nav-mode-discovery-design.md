# Nav mode discovery — a drawer on the phone

**Date:** 2026-08-27 (revised 2026-08-28)
**Status:** designed

## The problem

The gauntlet is reached by 11% of visitors. Every other mode in the nav lands at
24–28%. It is not a quality problem: people who open the gauntlet come back the
next day more than people who open anything else (70% vs 42% for the draft), and
those who finish a run play 19.3 of them.

It is a visibility problem with one cause in three parts.

**It has exactly one entry point.** The nav button at `index.html:95`, wired at
`js/auth.js:63`. No welcome-screen card, no link from inside a season. Europe and
career, which are not in the nav at all but open from inside the game, reach 33%
and 27% — more than the gauntlet with a nav button.

**That button is eighth of eight.** Current order: אתגרים · משחקונים · ליגות ·
1v1 · לוח שיאים · הישגים · פרופיל · **גאונטלט** · ⚙️. Three of the four buttons
between the modes and the gauntlet are not modes at all.

**Below 620px the strip scrolls sideways** (`css/style.css:1478-1490`,
`overflow-x: auto` with a trailing mask). Measured from the real CSS values
(`0.72rem`, padding `4px 7px`, gap `4px`): the seven buttons before the gauntlet
total ≈490px in a strip ≈323px wide on a 390px phone. The gauntlet begins more
than a full screen past the right edge.

**Not measurable:** `usage_events` stores no user agent by design, so the share of
mobile traffic cannot be confirmed from the data. The mechanism is verified in the
code and in the reach numbers; the device split is not.

## Why a drawer, and not a shorter strip

The first version of this spec kept the five modes in the strip and moved only the
account items into a menu. Its own arithmetic killed it: removing the three
account items frees ≈190px and dropping the beta chips ≈81px, taking the strip
from ≈679px to ≈408px — but after the pinned logo, ☰ and login, roughly **262px**
remain on a 390px phone. 408 does not fit in 262.

**The strip cannot hold five modes on a phone**, and no ordering makes it. Every
"shorten the bar" variant clips something; it only chooses what. A drawer clips
nothing, and if we are building a menu anyway, a partial one has no justification.

What the drawer deletes from the design: the mode-ordering trade-off, the fallback
ladder, the beta-chip hiding, the 360px width budget, and the dependency on
welcome-screen cards to keep אתגרים and ליגות reachable.

**The risk, stated plainly:** the four modes visible today go from one tap to two,
and may fall from 24–28% to something nearer 18–20%. The bad outcome is raising
the gauntlet's floor while lowering everyone else's ceiling. Two things make it
worth taking: the fast path already runs through the welcome screen, not the nav
(the daily challenge and the public league have cards there, and the gauntlet is
getting one) — so the drawer is the complete index rather than the shortcut; and
`usage_events` reports per-mode reach daily, so a drop shows up within two or
three days and 2–3 modes can be returned to the bar.

## What it does

Three changes. **All nav changes are scoped to ≤620px. The desktop nav is not
touched** — it has room, it keeps every button inline, and it keeps the beta chips
and the ⚙️ popover exactly as they are today.

### 1. The mobile top bar drops to three things

```
signed out:  [ 36–0 ]  ················  [ התחבר ]  [ ☰ ]
signed in:   [ 36–0 ]  ······························  [ ☰ ]
```

`התחבר` stays in the bar when signed out. Signups are at 12/day and falling; the
one acquisition CTA does not go behind an icon, and with only three items in the
bar there is no width pressure to justify it. When signed in, the user belongs in
the drawer header instead — there is nothing to sell.

### 2. The drawer holds everything

Slides in **from the right** (the RTL near edge), full height, over a backdrop.

| section | rows |
|---|---|
| header | avatar + username + יציאה, or a prominent התחבר |
| מודים | 🗓️ אתגרים · 🎲 משחקונים · 🏆 ליגות · ⚔️ 1v1 · 🗺 גאונטלט |
| עוד | לוח שיאים · הישגים · פרופיל |
| עיצוב | the existing theme controls |

Order inside מודים is the current nav order with the gauntlet moved up beside its
siblings. Nothing is past a fold, so the order is presentation, not a trade.

**A vertical row has room for state, which a strip never had.** The gauntlet row
**must** carry a subtitle from `gtRun()` — the current station, or an invitation
when there is no run — because that state is the reason to open it and the mode
has never been able to show it anywhere. Subtitles on the other four rows are
optional and out of scope here; if one is added it must degrade to no subtitle
rather than an empty line.

Behaviour:

- closes on backdrop click, on Escape, and on choosing any row
- body does not scroll while it is open
- the slide respects `prefers-reduced-motion`
- focus moves into the drawer on open and returns to ☰ on close
- ☰ carries `aria-expanded`; the drawer is a labelled `role="dialog"`

This is not new machinery. `pcBackdrop` / `.pcard-bd` / `.pcard-modal`
(`js/player-card.js:496`) already do backdrop + panel + click-out + Escape, and
shipped in v1.5.

**One known collision:** `theme.js:183` registers a document-level click listener
that closes `#theme-panel` whenever a click lands outside it. With the theme
controls living inside the drawer that listener would close them on every drawer
interaction. The mechanism is the plan's business; the requirement is that the
theme controls are visible and usable inside the drawer without a second
disclosure, and that the desktop ⚙️ popover keeps working unchanged.

### 3. A gauntlet card on the welcome screen

Independent of the drawer, and the gauntlet's first second door. Copies
`daily-welcome-card` markup and the `lgFillWelcomeCard` fill pattern
(`js/leagues.js:428`). Third card, below the public league. **Always shown** — not
gated on progress or on being signed in (the gauntlet runs entirely in
localStorage; `showGauntlet` has no auth check).

Subtitle reads from `gtRun()`:

- no run started (`!gtRunStarted(run)`) — a one-line description of the mode
- run in progress — the current station, from `run.at`
- run over (`run.over`) — an invitation to start a new one

## Explicitly not changing

- **The desktop nav.** Not one button, not one chip. Above 620px nothing moves.
- The `→ חזרה` back buttons. In RTL a back arrow points right; they are correct.
- No mode's own screens, rules or wording; nothing about how the gauntlet plays.

## Verification

Per `.claude/skills/verify`: measurement, not eyeballing. Chrome headless with a
throwaway `--user-data-dir`, driver reporting numbers into a banner.

| case | pass condition |
|---|---|
| 390px, signed out | bar holds logo + התחבר + ☰, no horizontal overflow |
| 390px, signed in | bar holds logo + ☰; user block renders in the drawer header |
| 360px, signed out | same, at the small-phone floor |
| 360px, drawer open | all five mode rows above the fold — the gauntlet row's `bottom` ≤ viewport height |
| 1200px | the inline nav is unchanged: all eight buttons present, beta chips shown, no ☰, no drawer |

Drawer behaviour, driven rather than inspected: opens on ☰, closes on backdrop
click, on Escape, and on choosing a row; `document.body` does not scroll while
open; the theme controls are visible inside it and a click on them does not close
it.

The welcome card runs against all three localStorage states the verify skill
names: no `gt` save at all, a `v: 1` save, and a current `v: 2` run in progress.
The empty state matters most — a fresh visitor is exactly who the card is for.

## Watching it after release

`usage_stats` already reports opens per mode per day. The numbers to watch, from
the four days before this change:

| mode | reach now |
|---|---|
| draft | 86% |
| europe | 33% |
| challenge | 28% |
| career | 27% |
| duel | 27% |
| minigame | 25% |
| league | 24% |
| **gauntlet** | **11%** |

Success is the gauntlet rising toward the pack. The failure to watch for is
challenge/minigame/league/duel sagging together — that is the extra tap, and the
answer is returning two or three modes to the bar rather than reverting.

## Deferred

`js/gauntlet-admin.js:147` (`תיקו → פנדלים`) has the same RTL arrow bug fixed in
`chemistry.js` and `career.js` on 2026-08-27. Admin-only, left alone deliberately.
