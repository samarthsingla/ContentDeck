-- Migration: Fix set_user_id() trigger to preserve explicit user_id
--
-- ROOT CAUSE: The trigger always overwrote user_id with auth.uid().
-- When the edge function inserts via service role key, auth.uid() is NULL,
-- so bookmarks were saved with user_id = NULL — invisible via RLS.
--
-- FIX: Use COALESCE to only set user_id when not explicitly provided.
-- This preserves the user_id from edge function inserts while still
-- auto-setting it for normal authenticated client inserts.

CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := COALESCE(NEW.user_id, auth.uid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up ghost bookmarks from previous broken inserts (user_id = NULL)
DELETE FROM bookmarks WHERE user_id IS NULL;
