-- =============================================
-- ContentDeck v2 Migration
-- =============================================
-- Run this in Supabase SQL Editor if you
-- already set up v1. New users: just run setup.sql
-- =============================================

ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
