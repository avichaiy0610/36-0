---
name: verify
description: How to build/launch/drive this app (36-0, static Hebrew football site) to verify changes at the real surface.
---

# Verifying 36-0

Plain static site — no build, no package.json. Two handles:

## 1. Browser surface (the real thing)

```bash
cd <repo> && python -m http.server 8901 &
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new \
  --disable-gpu --window-size=500,1100 --virtual-time-budget=12000 \
  --screenshot=out.png http://localhost:8901/index.html
```

- No click support in headless screenshot mode. To drive past the landing
  screen, copy the site to the scratchpad and append an auto-driver before
  `</body>`, e.g. `setTimeout(()=>showChallenges('daily'),800)` then
  `setTimeout(()=>document.getElementById('daily-play')?.click(),2500)`.
- Virtual time budget makes the setTimeouts fire instantly.
- Supabase calls fail gracefully offline; the UI still renders.

## 2. Node harness for the challenge engine (js/challenges.js)

Deterministic generator — runs headless in Node, but top-level `const`s don't
cross `vm.runInContext` calls: **concatenate** `js/data.js` + `js/player_nats.js`
+ prelude (`parseSeasonYear`, `YEAR_MIN/MAX` from SQUADS, `document` stub) +
`js/challenges.js` into one script. Then call `challengeSettings` /
`challengeRequirements` / `challengeDeckFor` for any period+key.

Gotchas:
- Challenge conditions must never change for keys already in progress
  (leaderboard fairness) — capture a golden JSON of pre-change outputs and
  diff after any generator edit.
- Generator is versioned by `CHAL_GEN2_FROM` key cutoffs; to see a future
  generator live in the UI, patch the cutoff in a scratchpad COPY only.

## 3. Admin panel offline (auth-gated UI)

`admin.html` is gated on `session.user.email`, so it renders nothing in a
headless run. To drive it, copy the site to the scratchpad and REPLACE
`js/supabase-client.js` with a stub that exports `_supabase` (auth.getSession →
the admin email, `from()` → a chainable that resolves `{data: [], error: null}`,
`rpc`/`channel` no-ops) plus `getCurrentUser()`. The whole panel then renders and
buttons can be clicked.

## 4. Always test the EMPTY state, and the OLD state

A driver that seeds localStorage tests the state you imagined, never the state a
real visitor arrives in. The gauntlet froze on first click for exactly that
reason: every scenario wrote a current-version save, so nobody ever ran the "no
save at all" branch, where building a blank run re-entered the loader that was
still building it. Old saves are the same trap from the other side — a migration
branch only runs for someone who played the previous version.

So for anything with a `localStorage` save, run three states, not one:

| state | how |
|---|---|
| fresh | `localStorage.removeItem(KEY)` before the click |
| previous version | write a save with the old `v` and the old fields |
| current | the seeded scenario you were going to write anyway |

And run the browser under `timeout 45 ...`: an infinite loop shows up as exit
code 124, which a screenshot alone will never tell you.

Learned the hard way three times: parsing the inline script proves nothing. The
dead "play" button, the dead preset button and the frozen gauntlet were all
runtime failures that a syntax check passed happily. Always click the thing.
