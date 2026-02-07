-- ContentDeck v2.0 Database Schema
-- Run this in Supabase SQL Editor for a fresh setup

-- Bookmarks table
create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  title text,
  image text,
  excerpt text,
  source_type text default 'auto',
  status text default 'unread' check (status in ('unread', 'reading', 'done')),
  is_favorited boolean default false,
  notes jsonb default '[]'::jsonb,
  tags text[] default '{}',
  metadata jsonb default '{}'::jsonb,
  synced boolean default false,
  created_at timestamptz default now(),
  status_changed_at timestamptz default now(),
  started_reading_at timestamptz,
  finished_at timestamptz
);

create index idx_bookmarks_source on bookmarks(source_type);
create index idx_bookmarks_status on bookmarks(status);
create index idx_bookmarks_created on bookmarks(created_at desc);

-- Tag areas
create table tag_areas (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  color text,
  emoji text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Junction table
create table bookmark_tags (
  bookmark_id uuid references bookmarks(id) on delete cascade,
  tag_area_id uuid references tag_areas(id) on delete cascade,
  primary key (bookmark_id, tag_area_id)
);

-- Status history (for streaks/stats)
create table status_history (
  id uuid primary key default gen_random_uuid(),
  bookmark_id uuid references bookmarks(id) on delete cascade,
  old_status text,
  new_status text,
  changed_at timestamptz default now()
);

-- Auto-detect source type trigger (case-insensitive)
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
  for each row execute function detect_source_type();

-- Status history trigger
create or replace function track_status_change()
returns trigger as $$
begin
  if OLD.status is distinct from NEW.status then
    insert into status_history (bookmark_id, old_status, new_status)
    values (NEW.id, OLD.status, NEW.status);
    NEW.status_changed_at := now();
    if NEW.status = 'reading' and OLD.status = 'unread' then
      NEW.started_reading_at := now();
    end if;
    if NEW.status = 'done' and OLD.status != 'done' then
      NEW.finished_at := now();
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger on_status_change
  before update on bookmarks
  for each row execute function track_status_change();

-- RLS (open access since no auth)
alter table bookmarks enable row level security;
create policy "Allow all" on bookmarks for all using (true) with check (true);
alter table tag_areas enable row level security;
create policy "Allow all" on tag_areas for all using (true) with check (true);
alter table bookmark_tags enable row level security;
create policy "Allow all" on bookmark_tags for all using (true) with check (true);
alter table status_history enable row level security;
create policy "Allow all" on status_history for all using (true) with check (true);
