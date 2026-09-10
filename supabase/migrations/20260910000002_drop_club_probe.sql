-- Removes the throwaway account used to verify set_my_club against production
-- on 2026-09-10. The anon key cannot delete an auth user, so the cleanup has to
-- come through a migration — the same way 20260823000006 removed the account
-- that proved the gauntlet achievement fix.
--
-- What it verified, so it does not have to be done again: a signed-in call
-- stores the club; an anonymous one is refused; and a hostile payload comes
-- back with its colours, its shape and its clubId nulled and its angle brackets
-- stripped, which is the whole point of the function existing.
DELETE FROM auth.users WHERE email LIKE 'clubcheck.%@example.com';
