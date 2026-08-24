-- One player, one spelling.
--
-- js/data.js carried him as גוסטאבו בוקקולי for his eleven Maccabi Haifa seasons
-- and as גוסטבו בוקולי for his one at Ahi Nazareth, so the site treated a single
-- twelve-season career as two men. The data file was corrected; these are the
-- rows that had already stored the old string inside their JSON — saved squads,
-- league and challenge seasons, duel rooms, one gauntlet run.
--
-- squads deliberately has no UPDATE policy: a game record is immutable to the
-- people playing it. Nothing here changes a result. It is the same player's name,
-- spelled the way it is on his shirt, so that everything which groups by name —
-- the profile's most-drafted, player_stats, the squad viewer — stops splitting
-- him in half.

DO $$
DECLARE
  old_name CONSTANT text := 'גוסטאבו בוקקולי';
  new_name CONSTANT text := 'גוסטבו בוקולי';
  n int;
BEGIN
  UPDATE squads
     SET players = replace(players::text, old_name, new_name)::jsonb
   WHERE players::text LIKE '%' || old_name || '%';
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'squads: %', n;

  UPDATE challenge_results
     SET players = replace(players::text, old_name, new_name)::jsonb
   WHERE players::text LIKE '%' || old_name || '%';
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'challenge_results: %', n;

  UPDATE league_results
     SET players = replace(players::text, old_name, new_name)::jsonb
   WHERE players::text LIKE '%' || old_name || '%';
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'league_results: %', n;

  -- the duel keeps both squads AND the deck they were dealt in one blob
  UPDATE duel_rooms
     SET draft = replace(draft::text, old_name, new_name)::jsonb
   WHERE draft::text LIKE '%' || old_name || '%';
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'duel_rooms: %', n;

  -- a run stores its squad and its fight log separately; either may name him
  UPDATE gauntlet_runs
     SET squad = CASE WHEN squad::text LIKE '%' || old_name || '%'
                      THEN replace(squad::text, old_name, new_name)::jsonb ELSE squad END,
         log   = CASE WHEN log::text   LIKE '%' || old_name || '%'
                      THEN replace(log::text,   old_name, new_name)::jsonb ELSE log   END
   WHERE squad::text LIKE '%' || old_name || '%'
      OR log::text   LIKE '%' || old_name || '%';
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'gauntlet_runs: %', n;
END $$;
