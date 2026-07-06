-- Apply the presence-aware get_duel_room to the remote DB (the initial migration
-- already ran, so its edited body won't re-execute). A participant who joined
-- before setting a username still shows as present ("מארח" / "יריב") instead of
-- looking like an empty slot.
CREATE OR REPLACE FUNCTION get_duel_room(p_code text)
RETURNS TABLE (code text, status text, settings jsonb, seed bigint,
               host_name text, guest_name text,
               host_ready boolean, guest_ready boolean, is_host boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT r.code, r.status, r.settings, r.seed,
         coalesce(hp.username, 'מארח'),
         CASE WHEN r.guest_id IS NULL THEN NULL ELSE coalesce(gp.username, 'יריב') END,
         r.host_ready, r.guest_ready,
         (r.host_id = auth.uid())
  FROM duel_rooms r
  LEFT JOIN profiles hp ON hp.id = r.host_id
  LEFT JOIN profiles gp ON gp.id = r.guest_id
  WHERE r.code = upper(btrim(p_code))
    AND (r.host_id = auth.uid() OR r.guest_id = auth.uid());
$$;
