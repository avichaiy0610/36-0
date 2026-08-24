-- Removes the throwaway account used to prove the achievement-array fix
-- end-to-end against production (a depth-5 run had to actually be written to
-- show that it now writes at all).
DELETE FROM gauntlet_runs WHERE rid LIKE 'diagnostic-%';
DELETE FROM user_achievements
  WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE 'diag-%@example.com');
DELETE FROM profiles
  WHERE id IN (SELECT id FROM auth.users WHERE email LIKE 'diag-%@example.com');
DELETE FROM auth.users WHERE email LIKE 'diag-%@example.com';
