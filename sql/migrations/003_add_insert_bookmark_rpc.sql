-- Migration: Add RPC function for external bookmark insert
-- The set_user_id() trigger overwrites user_id with auth.uid(), which is NULL
-- when using the service role key. This function inserts directly via SQL,
-- bypassing all BEFORE INSERT triggers.

CREATE OR REPLACE FUNCTION insert_bookmark_via_token(
  p_user_id UUID,
  p_url TEXT,
  p_title TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_source_type TEXT := 'blog';
BEGIN
  -- Detect source type (mirrors detect_source_type trigger logic)
  IF p_url ~* 'youtube\.com|youtu\.be|youtube\.app\.goo\.gl' THEN
    v_source_type := 'youtube';
  ELSIF p_url ~* 'twitter\.com|x\.com|t\.co' THEN
    v_source_type := 'twitter';
  ELSIF p_url ~* 'linkedin\.com|lnkd\.in' THEN
    v_source_type := 'linkedin';
  ELSIF p_url ~* 'substack\.com' THEN
    v_source_type := 'substack';
  END IF;

  INSERT INTO bookmarks (user_id, url, title, source_type, status, is_favorited, notes, tags, metadata, synced)
  VALUES (p_user_id, p_url, p_title, v_source_type, 'unread', false, '[]'::jsonb, '{}', '{}'::jsonb, false)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
