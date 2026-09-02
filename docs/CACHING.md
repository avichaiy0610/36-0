# Caching

Rules live in `vercel.json`. The one that matters:

## `/js/` and `/css/` are `public, no-cache`

The script and stylesheet URLs carry **no version** — `index.html` asks for
`js/game.js`, full stop. That makes any `max-age > 0` on them a correctness
problem, not a performance tuning knob: `index.html` is served
`max-age=0, must-revalidate` and is therefore always current, so a cached script
means one deploy's HTML running against another deploy's JavaScript.

`stale-while-revalidate` made it worse rather than better. It does not mean
"serve the fresh copy if you can" — it means **serve the stale copy now** and
fetch the new one for next time. With `max-age=600, stale-while-revalidate=604800`
a returning player could run a week-old `game.js`, and the fix they were told
about would only take effect on their *next* visit. Worse, the files revalidate
independently, so a page could mix a new `game.js` with an old `cup.js` and
produce a failure that exists in no deploy at all.

This was not theoretical. Bugs that had been fixed and deployed were reported
again from the live site — the bracket printing each side's goals next to the
other side, among others — while the deployed file on the origin was byte-identical
to `main`.

`no-cache` does **not** mean "do not store". The browser keeps the file and
revalidates it with its ETag, so a repeat visit pays a 304 (a few hundred bytes)
instead of re-downloading. The bandwidth saving that the caching change was for
is kept; only the staleness goes.

## If the round trips ever start to hurt

53 scripts and 7 stylesheets means ~60 conditional requests on a repeat visit.
Multiplexed over HTTP/2 that is cheap, but if it stops being cheap the answer is
**versioned URLs** — stamp `?v=<hash>` onto every tag at build time and serve
`/js/` as `max-age=31536000, immutable`, the way `/crests/` already is.

The answer is never a longer `max-age` on an unversioned file. That is the thing
that broke.

## Everything else

| Path | Policy | Why |
| --- | --- | --- |
| `/crests/` | 1 year, immutable | a club badge is a fixed asset; if one changes it changes under a new name |
| icons, `manifest.json` | 30 days | rarely change, and a stale one is cosmetic |
| `/player/`, `/team/` | 1 day + SWR | generated SEO pages; nothing interactive reads them, so a day behind is harmless |
| `index.html` (default) | `max-age=0, must-revalidate` | the entry point must never be stale |
