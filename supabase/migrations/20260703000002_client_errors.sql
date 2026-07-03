-- Lightweight client-side error log. Anyone (even anonymous) may INSERT their
-- own error report; nobody but the service role / dashboard may read it.
CREATE TABLE IF NOT EXISTS client_errors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  message    text,
  source     text,
  stack      text,
  user_agent text,
  url        text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE client_errors ENABLE ROW LEVEL SECURITY;

-- Insert only; length-capped so it can't be abused as free storage.
CREATE POLICY "client_errors_insert" ON client_errors FOR INSERT WITH CHECK (
  char_length(coalesce(message, '')) <= 2000
  AND char_length(coalesce(stack, '')) <= 8000
);
-- No SELECT policy → clients can never read the table (read via dashboard only).

CREATE INDEX IF NOT EXISTS client_errors_created_idx ON client_errors (created_at DESC);
