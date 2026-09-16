-- ─────────────────────────────────────────────────────────────────────────────
-- Approved pairs are readable by everyone, so the card can show them at once.
--
-- "אחרי שאישרתי לא כתוב 'צמדי הקהל' עם הצמד שאושר". Correct, and the reason was
-- a design mistake of mine rather than a missing step: approving writes
-- duo_approvals, and the card read pairs only out of js/crowd-overrides.js — a
-- static file that exists only after somebody runs a script and commits it. So
-- an approval was invisible until a deploy.
--
-- THE SPLIT THAT SHOULD HAVE BEEN THERE FROM THE START, and which the ratings
-- already had:
--
--   DISPLAY  — read live from the database. Approving is the decision; showing
--              what was decided should not wait for a build. crowd_ratings has
--              worked this way since the first day and nobody noticed a problem,
--              because there is none: it is the owner's own approved opinion,
--              and a failed fetch simply shows nothing.
--
--   EFFECT   — read from the static overlay, built by a script and committed.
--              This half MUST stay static: it changes ratings and chemistry
--              inside a simulation that has to be deterministic and work offline,
--              and a network hiccup must never be able to move a result.
--
-- So the same fact is served twice on purpose, and the duplication is the point:
-- one copy can be late and harmless, the other cannot be late at all.
--
-- The tier is not computed here. Seasons and titles live in js/data.js and
-- js/league_tables.js, not in Postgres — the client already knows how to work
-- them out, and it is the same rule build_chemistry.js uses.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW crowd_duos_public
WITH (security_invoker = false) AS
  SELECT a.pair_key
    FROM duo_approvals a;

REVOKE ALL ON TABLE crowd_duos_public FROM anon, authenticated;
GRANT SELECT ON TABLE crowd_duos_public TO anon, authenticated;
