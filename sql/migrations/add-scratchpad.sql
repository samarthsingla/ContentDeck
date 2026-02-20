-- Migration: Add scratchpad column to bookmarks
-- Replace typed notes (notes JSONB) with a single markdown scratchpad field.
-- The old `notes` column is retained (not dropped) to avoid destructive migration risk.
-- The app stops writing to it after this migration.

ALTER TABLE bookmarks
  ADD COLUMN IF NOT EXISTS scratchpad text NOT NULL DEFAULT '';

-- Migrate existing typed notes → scratchpad with ## type headers
UPDATE bookmarks
SET scratchpad = (
  SELECT string_agg(
    CASE note->>'type'
      WHEN 'insight'   THEN '## Insight'   || chr(10) || (note->>'content')
      WHEN 'question'  THEN '## Question'  || chr(10) || (note->>'content')
      WHEN 'highlight' THEN '## Highlight' || chr(10) || (note->>'content')
      ELSE                  '## Note'      || chr(10) || (note->>'content')
    END,
    chr(10) || chr(10) ORDER BY note->>'created_at'
  )
  FROM jsonb_array_elements(notes) AS note
)
WHERE jsonb_array_length(notes) > 0;
