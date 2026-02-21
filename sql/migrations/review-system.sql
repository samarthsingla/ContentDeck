-- Phase 2b.1: Review System Migration
-- Adds review tracking columns and queue RPC to bookmarks table.
-- Run in Supabase SQL Editor.

ALTER TABLE bookmarks
  ADD COLUMN last_reviewed_at timestamptz DEFAULT NULL,
  ADD COLUMN review_count     integer NOT NULL DEFAULT 0;

CREATE INDEX idx_bookmarks_review
  ON bookmarks (user_id, last_reviewed_at NULLS FIRST);

CREATE OR REPLACE FUNCTION get_review_queue(p_limit int DEFAULT 20)
RETURNS SETOF bookmarks LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT * FROM bookmarks
  WHERE user_id = auth.uid()
    AND (last_reviewed_at IS NULL OR last_reviewed_at < now() - interval '7 days')
  ORDER BY last_reviewed_at NULLS FIRST, created_at ASC
  LIMIT p_limit;
$$;
