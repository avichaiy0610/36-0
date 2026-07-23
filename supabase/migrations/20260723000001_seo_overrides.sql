-- Admin overrides for the programmatic team SEO pages (/team/<id>).
-- Lets the owner fix an auto-generated lineup (all-time OR a specific season),
-- fill in a missing team top scorer, and reword page headings — all without a
-- rebuild. Everyone can read; only the admin can write (enforced by RLS).

create table if not exists seo_overrides (
  team_id    text not null,
  season     text not null default '',   -- '' = all-time / page-level (texts live here)
  lineup     jsonb,                       -- {gk:[{name,o}], def:[...], mid:[...], att:[...]}
  top_scorer text,                        -- e.g. 'עומר אצילי (12)'
  texts      jsonb,                       -- {h1, pool_heading, table_heading}
  updated_at timestamptz not null default now(),
  primary key (team_id, season)
);

alter table seo_overrides enable row level security;

create policy "seo_overrides read for all"
  on seo_overrides for select
  using (true);

-- Only the admin account may create/update/delete.
-- ⚠ If you log in with a different email, replace it here.
create policy "seo_overrides admin write"
  on seo_overrides for all
  using  ((auth.jwt() ->> 'email') = 'avichaiy0610@outlook.com')
  with check ((auth.jwt() ->> 'email') = 'avichaiy0610@outlook.com');
