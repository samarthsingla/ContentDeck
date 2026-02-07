-- =============================================
-- ContentDeck v3.5 — Open Graph Images Migration
-- =============================================
-- Run this in Supabase SQL Editor if upgrading from v3.4
-- =============================================

-- Add image column for Open Graph thumbnails
alter table bookmarks add column if not exists image text;

-- Create index for faster queries on bookmarks with/without images
create index if not exists idx_bookmarks_image on bookmarks((image is not null));
