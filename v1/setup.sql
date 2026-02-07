-- =============================================
-- ContentDeck - Supabase Setup
-- =============================================
-- Run this in your Supabase project's SQL Editor
-- (Dashboard > SQL Editor > New Query)
-- =============================================

-- 1. Create the bookmarks table
create table bookmarks (
  id uuid default gen_random_uuid() primary key,
  url text not null,
  title text,
  source_type text not null default 'auto',
  status text not null default 'unread',
  notes text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

-- 2. Create indexes for fast filtering
create index idx_bookmarks_source on bookmarks(source_type);
create index idx_bookmarks_status on bookmarks(status);
create index idx_bookmarks_created on bookmarks(created_at desc);

-- 3. Auto-detect source type from URL on insert
create or replace function detect_source_type()
returns trigger as $$
begin
  if NEW.source_type is null or NEW.source_type = 'auto' then
    if NEW.url ~* 'youtube\.com|youtu\.be|youtube\.app\.goo\.gl' then
      NEW.source_type := 'youtube';
    elsif NEW.url ~* 'twitter\.com|x\.com|t\.co' then
      NEW.source_type := 'twitter';
    elsif NEW.url ~* 'linkedin\.com|lnkd\.in' then
      NEW.source_type := 'linkedin';
    elsif NEW.url ~* 'substack\.com' then
      NEW.source_type := 'substack';
    else
      NEW.source_type := 'blog';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger auto_detect_source
  before insert on bookmarks
  for each row
  execute function detect_source_type();

-- 4. Enable Row Level Security (allow all for personal use)
alter table bookmarks enable row level security;

create policy "Allow all operations" on bookmarks
  for all
  using (true)
  with check (true);
