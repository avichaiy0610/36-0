-- Each queued item now also carries a ready-to-paste COMMENT (engagement hook)
-- the owner manually drops on sports outlets' posts about the same story — the
-- acquisition channel. draft_text stays the auto-publishable page post.
alter table post_queue add column if not exists comment_text text;
