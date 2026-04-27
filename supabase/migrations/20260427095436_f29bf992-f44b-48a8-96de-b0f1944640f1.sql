-- Login relays: short-lived rows used to bridge OAuth sessions from
-- the external system browser back into the native app via polling.
CREATE TABLE IF NOT EXISTS public.login_relays (
  id UUID PRIMARY KEY,
  token_hash TEXT NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'magiclink',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.login_relays ENABLE ROW LEVEL SECURITY;

-- The relay row is keyed by an unguessable UUID known only to the
-- two endpoints participating in the OAuth handoff, so policies
-- intentionally allow anon + authenticated to read / write / delete
-- (but only by exact id from the application code path).
CREATE POLICY "Anyone can insert login relays"
  ON public.login_relays
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can select login relays"
  ON public.login_relays
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update login relays"
  ON public.login_relays
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete login relays"
  ON public.login_relays
  FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS login_relays_created_at_idx
  ON public.login_relays (created_at);
