# Usage telemetry — what gets played

**Date:** 2026-08-24
**Status:** implemented

## The problem

"How many people played each mode yesterday" had no answer for half the site.
`game_results` only sees a *saved* draft season by a *signed-in* player, and
career, the mini-games and Europe write nothing at all — they run entirely in the
browser. Vercel Web Analytics cannot fill the gap either: the app never changes
its URL, so every mode is one pageview of `/`.

Measured before the change: 4,316 saved seasons vs 21,167 finished ones on
`profiles.games_played`, zero rows for career and the mini-games, zero `cr_`/`eu_`
achievements since launch.

## What it does

One event when a mode is opened, one when a run finishes. Nothing is rendered,
nothing is logged to the console, no screen reads it back. Anonymous play counts:
that is most of the mini-game and career traffic.

## Data model

`usage_events` — `ts`, `client_id` (random UUID in localStorage), `user_id` (only
when signed in), `mode`, `event` (`open`/`finish`), `detail` (≤40 chars).

RLS is on with **no policies**: nobody reads or writes the rows directly.

- `track(p jsonb)` — SECURITY DEFINER, granted to `anon` and `authenticated`.
  Drops unknown modes/events, truncates `detail`, takes the identity from
  `auth.uid()` rather than the payload.
- `usage_stats(days)` / `usage_detail(days)` / `usage_daily(days)` — aggregates
  only, each gated on `is_site_admin()` (the admin email, same rule as
  `site_texts`), executable by `authenticated` only.

Modes: `draft`, `challenge`, `career`, `minigame`, `gauntlet`, `europe`, `duel`,
`league`.

## Client

`js/track.js` (~40 lines) — the per-browser id, and `track(event, mode, detail)`:
fire-and-forget, 2-second duplicate guard, every failure swallowed. A counter must
never break a game.

Call sites:

| where | event |
|---|---|
| `showScreen()` via `TRACK_SCREENS` | `open` for career, mini-games, Europe, gauntlet, duel, leagues, challenges |
| `startGame()`, `startChallenge()` | `open` for draft / challenge (detail = period) |
| each `mg*Open()` | `open` minigame, detail = game name |
| each mini-game's end | `finish` minigame, detail = game name (+ result) |
| `game.js` season end, `submitLeagueDraft()` | `finish` draft / challenge / duel / league |
| `career.js` after `crAward()` | `finish` career, detail = `"3"`, `"10F"`, `"5R"` |
| `europe.js euSubmit()` | `finish` europe, detail = league rank or `qual` |
| `gauntlet.js gtSubmitRun()` when the run ends | `finish` gauntlet, detail = depth |

## Viewing it

A `usage-section` in `admin.html`, shown only for the admin account: people per
day, then a day × mode table reading "opened ← finished" in people, then the
breakdown inside each mode.

## Privacy

No IP, no user agent, no URL, nothing anyone typed. The privacy policy's existing
"anonymous, aggregate usage data" line covers it and stays. The event is not
disguised to defeat blockers — a visitor with DevTools open can see the call, and
that is the honest floor.

## Retention

The table only grows; housekeeping is a manual
`DELETE FROM usage_events WHERE ts < now() - interval '180 days'`.

## Verified

Anon RPC insert accepted, bogus mode dropped, direct table read empty, aggregate
RPCs refused for anon. Driven headless in the real app: 11 `open` events from
real clicks plus a `finish` from a lost versus round, all landing as rows.
Admin section rendered against fixtures. Test rows deleted.
