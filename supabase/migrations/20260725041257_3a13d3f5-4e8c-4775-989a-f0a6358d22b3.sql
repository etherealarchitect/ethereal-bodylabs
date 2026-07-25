
CREATE POLICY "Deny all client access to passkey_challenges"
  ON public.passkey_challenges
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
