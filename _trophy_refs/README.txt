Source photographs for the five trophies.

Name them exactly: league, cup, ucl, uel, uecl  (.png .jpg .jpeg .webp)

  league  צלחת האליפות
  cup     גביע המדינה
  ucl     ליגת האלופות
  uel     הליגה האירופית
  uecl    קונפרנס ליג

Then:  python scripts/build_trophies.py
       node scripts/stamp_assets.js

That writes js/trophy-art.js (the photos, cut out and inlined as data URIs) and
js/trophies.js starts using them instead of its drawn fallbacks. Nothing here is
served to anyone — only the processed output in js/ ships.

A PLAIN BACKGROUND IS REQUIRED. The cut is a flood fill inward from the border,
so a studio shot on white or black comes out clean and a photo taken against a
crowd has nothing to remove. The script refuses those out loud rather than
shipping a rectangle of stadium.
