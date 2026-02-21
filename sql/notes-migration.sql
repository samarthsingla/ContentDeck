-- Phase 2.1: Standalone Notes Schema
-- Run in Supabase SQL Editor

-- notes table
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  title text not null default '',
  content text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_notes_user on notes(user_id);
create index idx_notes_updated on notes(updated_at desc);

-- note_bookmarks junction
create table note_bookmarks (
  note_id uuid references notes(id) on delete cascade,
  bookmark_id uuid references bookmarks(id) on delete cascade,
  primary key (note_id, bookmark_id)
);

-- note_tags junction
create table note_tags (
  note_id uuid references notes(id) on delete cascade,
  tag_area_id uuid references tag_areas(id) on delete cascade,
  primary key (note_id, tag_area_id)
);

-- Triggers: reuse existing set_user_id()
create trigger set_note_user before insert on notes
  for each row execute function set_user_id();

-- updated_at auto-refresh
create or replace function update_notes_timestamp()
returns trigger as $$ begin NEW.updated_at := now(); return NEW; end; $$ language plpgsql;
create trigger notes_updated before update on notes
  for each row execute function update_notes_timestamp();

-- RLS
alter table notes enable row level security;
create policy "Users CRUD own notes" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table note_bookmarks enable row level security;
create policy "Users manage own note_bookmarks" on note_bookmarks
  for all using (note_id in (select id from notes where user_id = auth.uid()))
  with check (note_id in (select id from notes where user_id = auth.uid()));

alter table note_tags enable row level security;
create policy "Users manage own note_tags" on note_tags
  for all using (note_id in (select id from notes where user_id = auth.uid()))
  with check (note_id in (select id from notes where user_id = auth.uid()));
