-- Cumulative one-time milestones were mistakenly counted up (e.g. "חובבן ×2").
-- Reset their repeat counter to 1; the edge function no longer increments them.
UPDATE user_achievements
   SET times_earned = 1
 WHERE achievement_key ~ '^games_\d+$'
    OR achievement_key IN ('all_formations', 'all_clubs');
