# Caching

Rules live in `vercel.json`. Two things have to be true at once, and only one
arrangement gets both.

## The two constraints

**Freshness.** `index.html` is served `max-age=0, must-revalidate`, so it is
always current. If the scripts it names are cached under a bare name, a returning
player runs one deploy's HTML against another deploy's JavaScript. That is not
hypothetical: fixed bugs came back from the live site while the deployed file on
the origin was byte-identical to `main`. `stale-while-revalidate` made it worse
rather than better — it does not mean "fetch the fresh one", it means **serve the
stale one now** and fetch the new one for next time, and the 60 files revalidate
independently, so a page could mix a new `game.js` with an old `cup.js` and fail
in a way no deploy ever did.

**Cost.** Vercel's free tier is metered in **edge requests** (1,000,000, then the
project is *paused*). `index.html` pulls **53 scripts and 7 stylesheets**. Serving
those `no-cache` — correct, and the obvious fix for freshness — spends ~60 edge
requests on *every single page load*, because a conditional request is still a
request. That is roughly **16,000 page views to the cap**. It is the single
largest lever on the bill.

## The arrangement: stamped URLs + immutable

`scripts/stamp_assets.js` rewrites every local asset reference to carry a hash of
that file's contents:

```html
<script src="js/game.js?v=5344ec0e"></script>
```

The URL changes if and only if the bytes change, so `/js/` and `/css/` are served
`max-age=31536000, immutable` **honestly**:

| | freshness | edge requests per repeat visit |
| --- | --- | --- |
| `max-age=600` + SWR, bare names | ✗ up to a week stale, mixable | ~0–60 |
| `no-cache`, bare names | ✓ | **~61** |
| stamped + `immutable` | ✓ | **1** (just `index.html`) |

A deploy that changes one file re-fetches that one file. A deploy that changes
nothing re-fetches nothing.

## The one rule this creates

**After editing anything in `js/` or `css/`, run the stamper before deploying:**

```bash
node scripts/stamp_assets.js          # rewrite the stamps
node scripts/stamp_assets.js --check  # exit 1 if any are stale (for CI/pre-push)
```

It is idempotent, so running it when nothing changed is free. Forgetting it is
the one failure mode: an unstamped edit keeps the old URL, and the old URL is
cached for a year — the change reaches nobody. `--check` exists so this can be
enforced rather than remembered.

## Everything else

| Path | Policy | Why |
| --- | --- | --- |
| `/crests/` | 1 year, immutable | a club badge is a fixed asset; a changed badge gets a new name |
| icons, `manifest.json` | 30 days | rarely change, and a stale one is cosmetic |
| `/player/`, `/team/` | 1 day + SWR | generated SEO pages, nothing interactive reads them |
| `index.html` (default) | `max-age=0, must-revalidate` | the entry point must never be stale |

## If edge requests still run hot

The remaining cost is *first* visits and crawlers, which pay the full ~60. The
next lever is concatenating `js/` into one bundle at deploy time — 53 requests to
1. That is a real change (load order is load-bearing; these are plain scripts
sharing globals, so a straight concatenation in `index.html` order is equivalent)
and it has not been done. The 1,597 generated SEO pages are also crawled
regularly; their 1-day cache is what keeps that bounded.
