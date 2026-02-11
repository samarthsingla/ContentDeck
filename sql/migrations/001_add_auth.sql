-- Migration: Add Supabase Auth (user_id + RLS)
-- Run this AFTER enabling Auth providers in the Supabase Dashboard.
-- See docs/SUPABASE_AUTH_SETUP.md for full instructions.

-- Add user_id to all user-facing tables
ALTER TABLE bookmarks ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE tag_areas ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE status_history ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Performance indexes
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_tag_areas_user ON tag_areas(user_id);
CREATE INDEX idx_status_history_user ON status_history(user_id);

-- Drop old open policies
DROP POLICY "Allow all" ON bookmarks;
DROP POLICY "Allow all" ON tag_areas;
DROP POLICY "Allow all" ON bookmark_tags;
DROP POLICY "Allow all" ON status_history;

-- User-scoped RLS policies
CREATE POLICY "Users see own bookmarks" ON bookmarks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users see own tag areas" ON tag_areas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users see own bookmark tags" ON bookmark_tags
  FOR ALL USING (bookmark_id IN (SELECT id FROM bookmarks WHERE user_id = auth.uid()))
  WITH CHECK (bookmark_id IN (SELECT id FROM bookmarks WHERE user_id = auth.uid()));
CREATE POLICY "Users see own status history" ON status_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-set user_id on insert
CREATE OR REPLACE FUNCTION set_user_id() RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_bookmark_user BEFORE INSERT ON bookmarks
  FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_tag_area_user BEFORE INSERT ON tag_areas
  FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_status_history_user BEFORE INSERT ON status_history
  FOR EACH ROW EXECUTE FUNCTION set_user_id();
