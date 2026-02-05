-- =============================================
-- ContentDeck v3 — Full Setup (New Users)
-- =============================================
-- Run this in Supabase SQL Editor for a fresh install.
-- If upgrading from v2, run migrate-v3.sql instead.
-- =============================================

-- 1. Bookmarks table
create table bookmarks (
  id uuid default gen_random_uuid() primary key,
  url text not null,
  title text,
  image text,
  source_type text not null default 'auto',
  status text not null default 'unread',
  notes text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  status_changed_at timestamptz,
  started_reading_at timestamptz,
  finished_at timestamptz
);

create index idx_bookmarks_source on bookmarks(source_type);
create index idx_bookmarks_status on bookmarks(status);
create index idx_bookmarks_created on bookmarks(created_at desc);

-- 2. Auto-detect source type from URL on insert
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

-- 3. Tag Areas table
create table tag_areas (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  color text default '#6c63ff',
  emoji text default '📁',
  sort_order int default 0,
  created_at timestamptz default now()
);

create index idx_tag_areas_sort on tag_areas(sort_order);

-- 4. Bookmark-Tag junction table
create table bookmark_tags (
  bookmark_id uuid references bookmarks(id) on delete cascade,
  tag_area_id uuid references tag_areas(id) on delete cascade,
  primary key (bookmark_id, tag_area_id)
);

create index idx_bookmark_tags_tag on bookmark_tags(tag_area_id);

-- 5. Status history table
create table status_history (
  id uuid default gen_random_uuid() primary key,
  bookmark_id uuid references bookmarks(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_at timestamptz default now()
);

create index idx_status_history_bookmark on status_history(bookmark_id);
create index idx_status_history_changed on status_history(changed_at desc);

-- 6. Trigger: track status changes on bookmarks
create or replace function track_status_changes()
returns trigger as $$
begin
  if OLD.status is distinct from NEW.status then
    NEW.status_changed_at := now();
    if NEW.status = 'reading' and OLD.status = 'unread' then
      NEW.started_reading_at := now();
    end if;
    if NEW.status = 'done' then
      NEW.finished_at := now();
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_track_status_changes
  before update on bookmarks
  for each row
  execute function track_status_changes();

-- 7. Trigger: record status history
create or replace function record_status_history()
returns trigger as $$
begin
  if OLD.status is distinct from NEW.status then
    insert into status_history (bookmark_id, old_status, new_status)
    values (NEW.id, OLD.status, NEW.status);
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_record_status_history
  after update on bookmarks
  for each row
  execute function record_status_history();

-- 8. Trigger: sync tags text[] cache when bookmark_tags changes
create or replace function sync_tags_cache()
returns trigger as $$
declare
  target_id uuid;
begin
  target_id := coalesce(NEW.bookmark_id, OLD.bookmark_id);
  update bookmarks set tags = (
    select coalesce(array_agg(ta.name order by ta.sort_order), '{}')
    from bookmark_tags bt
    join tag_areas ta on ta.id = bt.tag_area_id
    where bt.bookmark_id = target_id
  )
  where id = target_id;
  return null;
end;
$$ language plpgsql;

create trigger trg_sync_tags_cache
  after insert or delete on bookmark_tags
  for each row
  execute function sync_tags_cache();

-- 9. RLS policies (permissive for personal use)
alter table bookmarks enable row level security;
create policy "Allow all operations" on bookmarks
  for all using (true) with check (true);

alter table tag_areas enable row level security;
create policy "Allow all on tag_areas" on tag_areas
  for all using (true) with check (true);

alter table bookmark_tags enable row level security;
create policy "Allow all on bookmark_tags" on bookmark_tags
  for all using (true) with check (true);

alter table status_history enable row level security;
create policy "Allow all on status_history" on status_history
  for all using (true) with check (true);
