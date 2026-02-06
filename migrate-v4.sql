-- =============================================
-- ContentDeck v4 — Migration from v3.5
-- =============================================
-- Run this in Supabase SQL Editor to upgrade.
-- =============================================

-- 1. Add markdown content and metadata to bookmarks
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS nugget TEXT DEFAULT '';
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS embedding FLOAT8[];
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS node_type TEXT DEFAULT 'media';

-- 2. Add seed keywords, embedding, hibernation, and sub-area support to tag_areas
ALTER TABLE tag_areas ADD COLUMN IF NOT EXISTS seed_keywords TEXT[] DEFAULT '{}';
ALTER TABLE tag_areas ADD COLUMN IF NOT EXISTS embedding FLOAT8[];
ALTER TABLE tag_areas ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE tag_areas ADD COLUMN IF NOT EXISTS parent_area_id UUID REFERENCES tag_areas(id);

-- 3. Index for filtering active areas and sub-area lookups
CREATE INDEX IF NOT EXISTS idx_tag_areas_active ON tag_areas(is_active);
CREATE INDEX IF NOT EXISTS idx_tag_areas_parent ON tag_areas(parent_area_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_node_type ON bookmarks(node_type);
