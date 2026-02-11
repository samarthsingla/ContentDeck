-- Migration: Add user_tokens table for API token authentication
-- Used by bookmarklet and iOS Shortcut to save bookmarks via edge function

CREATE TABLE user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default',
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_user_tokens_hash ON user_tokens(token_hash);

ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tokens" ON user_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-set user_id on insert (same pattern as bookmarks/tag_areas/status_history)
CREATE TRIGGER set_user_token_user
  BEFORE INSERT ON user_tokens
  FOR EACH ROW EXECUTE FUNCTION set_user_id();
