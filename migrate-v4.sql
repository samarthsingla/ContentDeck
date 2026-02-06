-- =============================================
-- ContentDeck v4 — YouTube Metadata Migration
-- =============================================
-- Run this in Supabase SQL Editor
-- =============================================

-- Add YouTube-specific metadata columns
alter table bookmarks add column if not exists duration text;
alter table bookmarks add column if not exists channel text;

-- Add content storage for article excerpts/summaries
alter table bookmarks add column if not exists excerpt text;
alter table bookmarks add column if not exists word_count int;
alter table bookmarks add column if not exists reading_time int;

-- Bookmark notes table for structured reflection
create table if not exists bookmark_notes (
  id uuid default gen_random_uuid() primary key,
  bookmark_id uuid references bookmarks(id) on delete cascade,
  content text not null,
  note_type text not null default 'note',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_bookmark_notes_bookmark on bookmark_notes(bookmark_id);
create index if not exists idx_bookmark_notes_type on bookmark_notes(note_type);

-- RLS for bookmark_notes
alter table bookmark_notes enable row level security;
create policy if not exists "Allow all on bookmark_notes" on bookmark_notes
  for all using (true) with check (true);

-- Bookmark links for wikilinks/backlinks
create table if not exists bookmark_links (
  source_id uuid references bookmarks(id) on delete cascade,
  target_id uuid references bookmarks(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (source_id, target_id)
);

alter table bookmark_links enable row level security;
create policy if not exists "Allow all on bookmark_links" on bookmark_links
  for all using (true) with check (true);
