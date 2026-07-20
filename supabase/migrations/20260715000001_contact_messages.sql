-- Contact form: visitors submit messages that land in the admin panel
-- (no real inbox / email). Anyone may send; only the admin can read.

CREATE TABLE IF NOT EXISTS contact_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text,
  email      text,
  message    text NOT NULL,
  user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  handled    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_message_len CHECK (char_length(message) BETWEEN 1 AND 4000),
  CONSTRAINT contact_name_len    CHECK (char_length(coalesce(name, ''))  <= 80),
  CONSTRAINT contact_email_len   CHECK (char_length(coalesce(email, '')) <= 200)
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone (even anonymous) may submit a message; the CHECK constraints above cap
-- the sizes so the endpoint can't be abused to store huge blobs.
GRANT INSERT ON contact_messages TO anon, authenticated;
CREATE POLICY "anyone can send a message" ON contact_messages
  FOR INSERT WITH CHECK (true);

-- Only the admin account may read/curate the messages (same rule as site_texts).
-- ⚠ If you log in with a different email, replace it here.
GRANT SELECT, UPDATE ON contact_messages TO authenticated;
CREATE POLICY "admin reads messages" ON contact_messages
  FOR SELECT USING ((auth.jwt() ->> 'email') = 'avichaiy0610@outlook.com');
CREATE POLICY "admin curates messages" ON contact_messages
  FOR UPDATE USING ((auth.jwt() ->> 'email') = 'avichaiy0610@outlook.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'avichaiy0610@outlook.com');

CREATE INDEX IF NOT EXISTS contact_messages_recent
  ON contact_messages (created_at DESC);
