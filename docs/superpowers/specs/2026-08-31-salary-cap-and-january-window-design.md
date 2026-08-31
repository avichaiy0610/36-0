# Salary cap, and a January window

**Date:** 2026-08-31
**Status:** designed, build in progress

Two additions to the game that already exists, not two new games. Both put one
more decision inside a run that is otherwise a sequence of picks.

---

# 1. Salary cap (תקרת שכר)

A separate mode, reached from its own card on the setup screen beside the career
card — the user's call, and it matches how career already enters.

## The price of a player

Exponential, the user's call, and the reason the mode is interesting:

```
price(ovr) = 0.5 × 1.12 ^ (ovr − 70)      million ₪, rounded to 0.1
```

| ovr | 65 | 70 | 75 | 80 | 83 | 85 | 88 | 90 | 93 | 95 |
|---|---|---|---|---|---|---|---|---|---|---|
| ₪M | 0.3 | 0.5 | 0.9 | 1.6 | 2.2 | 2.7 | 3.8 | 4.8 | 6.8 | 8.5 |

A 90 costs **9.6×** a 70 and is worth 1.29× his rating. That asymmetry is the
whole mechanic: one star is priced like nine journeymen, so every star is an
argument with the rest of the XI.

## The budget

Calibrated against 4,000 simulated drafts on the real squad pool rather than
picked out of the air (`scripts/sim/` harness pattern; the working script is in
the session scratchpad):

| strategy | median cost | mean XI ovr |
|---|---|---|
| always take the best available | 30.3M | 84.5 |
| always take the best rating-per-₪ | 3.3M | 65.2 |
| random | 12.4M | 75.4 |

So the band where decisions actually happen is 22M–30M. Below ~12M the mode is
just "take the cheapest man" and the XI collapses; above ~35M the cap never
binds.

| difficulty | budget | share of greedy drafts that fit |
|---|---|---|
| קל | 30M | 47% |
| רגיל | 26M | 12% |
| קשה | 22M | 1% |

Same 3:1:0-shaped ladder the game already uses for rerolls: easy is generous,
normal forces choices, hard forces sacrifices.

## Going over — the rule that makes it a game

The user chose the dramatic option: **you may always pick the player you want,
even when you cannot afford him.** The budget is not a wall.

What it costs is a place in the XI. Overspending puts the squad **over cap**,
and a run cannot be simulated over cap. To get back under you **release** a
player you already picked — his fee returns in full, and his slot stays empty.

An empty slot is not a hole: at kick-off it is filled by a **free agent**, a
low-rated player (≤70) who costs nothing. The precedent already exists in the
game — `js/mg-auction.js` closes unfilled slots exactly this way, so the concept
and the wording are not new to a player who has met the auction.

So the real sentence of this mode is: *a star costs you a starter.* That is the
decision, and it is legible without a tutorial.

## What the player sees

- Every player token in the draft list carries his price.
- A budget bar at the top: spent / remaining, in ₪ millions, tabular figures.
- A player you cannot afford is **not** disabled — he is marked, and picking him
  turns the bar red and reveals the release list.
- The results screen names the XI's total wage bill, and any free agents in it.

## Achievements (after the rules, never before)

Derived, so they cannot contradict the mechanic:

- **קמצן** — finish a season with budget left over
- **מציאה** — win the league with the cheapest XI you have ever fielded
- **תקציב מאוזן** — a perfect 36-0 under the cap
- **מכר את הכוכב** — finish having released a player rated 88+

## Explicitly out of scope

The cap does not touch the daily challenge, the leagues, the gauntlet or the
duel. It is one mode with one card.

---

# 2. חלון ההעברות של ינואר

Modelled on 38-0's January Transfer Window, whose mechanics were read out of the
live app's own bundles in this session. What is worth taking is not the transfer
— it is the **gamble**.

Their version: at 19 of 38 games a screen offers "Enter the transfer market" or
"Stick with your XI", with the line *"gamble on one move. There is no undo."* A
weighted scenario is then drawn from sixteen, each with its own rules — a blind
signing for the weakest slot, a bid for your best player you may refuse, a forced
sale with no vote, three punts to choose between. One out, one in, committed on
the server. The result becomes the share card: "Held firm" or "Deadline day".

## Where ours fires

- **The regular draft** — after 18 of 36 games. Exactly half, as 19/38 is.
- **The career** — in the transfer window that already exists between seasons.
- **NOT the daily challenge and NOT the leagues.** The user's call, and it is the
  right one: everyone there plays identical conditions, and a randomly drawn
  scenario would break the comparison the boards depend on.
- Not the gauntlet, which has its own run rules and spoils already.

## The shape

Same two doors: stick, or gamble. One move, no undo. A scenario drawn from a
small set, each targeting the weakest slot unless it says otherwise. Ours should
start with four rather than sixteen, and only grow if people use it:

- **מציאה** — one blind signing for the weakest slot
- **ההצעה** — a bid for your best player: cash in for two replacements, or keep him
- **מכירה כפויה** — the board sells a starter, a blind replacement arrives, no vote
- **שלוש שיחות** — three candidates for the weakest slot, keep one

## Open, deliberately

Whether the outcome is committed locally or server-side. 38-0 commits on the
server, which is what makes "no undo" true rather than polite. Ours has no such
endpoint, and adding one is a bigger decision than the feature — the draft is
local-first by design and the leaderboards already trust the client.

---

## Not started

The Football Manager direction the user raised is a much larger question and is
not part of this spec. It is not an addition to a run; it is a different
relationship with the game, and it deserves its own conversation before any of
it is designed.
