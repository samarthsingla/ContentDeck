-- Areas & Tagging Redesign: Two-Tier Model
-- Areas = managed categories via bookmark_tags junction table
-- Tags = free-text string[] on bookmarks (unchanged)

-- 1. Clean up duplicate areas (keep oldest by created_at)
DELETE FROM tag_areas a
USING tag_areas b
WHERE a.user_id = b.user_id
  AND lower(a.name) = lower(b.name)
  AND a.created_at > b.created_at;

-- 2. Add unique constraint on tag_areas (user_id, name)
ALTER TABLE tag_areas ADD CONSTRAINT tag_areas_name_user_unique UNIQUE (user_id, name);

-- 3. Populate bookmark_tags from existing bookmarks.tags where tag matches an area name
INSERT INTO bookmark_tags (bookmark_id, tag_area_id)
SELECT DISTINCT b.id, ta.id
FROM bookmarks b
CROSS JOIN LATERAL unnest(b.tags) AS t
JOIN tag_areas ta ON lower(ta.name) = lower(t) AND ta.user_id = b.user_id
ON CONFLICT DO NOTHING;
