-- =============================================
-- ContentDeck v3 Migration
-- =============================================
-- Run this in Supabase SQL Editor AFTER setup.sql
-- Adds: tag areas, bookmark-tag junction, status
-- tracking timestamps, status history
-- =============================================

-- 1. Tag Areas table
create table if not exists tag_areas (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  color text default '#6c63ff',
  emoji text default '📁',
  sort_order int default 0,
  created_at timestamptz default now()
);

create index idx_tag_areas_sort on tag_areas(sort_order);

-- 2. Bookmark-Tag junction table
create table if not exists bookmark_tags (
  bookmark_id uuid references bookmarks(id) on delete cascade,
  tag_area_id uuid references tag_areas(id) on delete cascade,
  primary key (bookmark_id, tag_area_id)
);

create index idx_bookmark_tags_tag on bookmark_tags(tag_area_id);

-- 3. Status tracking columns on bookmarks
alter table bookmarks add column if not exists status_changed_at timestamptz;
alter table bookmarks add column if not exists started_reading_at timestamptz;
alter table bookmarks add column if not exists finished_at timestamptz;

-- 4. Status history table
create table if not exists status_history (
  id uuid default gen_random_uuid() primary key,
  bookmark_id uuid references bookmarks(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_at timestamptz default now()
);

create index idx_status_history_bookmark on status_history(bookmark_id);
create index idx_status_history_changed on status_history(changed_at desc);

-- 5. Trigger: track status changes on bookmarks
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

-- 6. Trigger: record status history
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

-- 7. Trigger: sync tags text[] cache when bookmark_tags changes
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

-- 8. Data migration: backfill existing tags into tag_areas + bookmark_tags
do $$
declare
  tag_name text;
  area_id uuid;
  bm record;
begin
  -- Get all unique tags from existing bookmarks
  for tag_name in
    select distinct unnest(tags) as t from bookmarks where tags is not null and array_length(tags, 1) > 0 order by t
  loop
    -- Create tag_area if it doesn't exist
    insert into tag_areas (name, emoji, color)
    values (tag_name, '🏷️', '#6c63ff')
    on conflict (name) do nothing
    returning id into area_id;

    -- If it already existed, fetch its id
    if area_id is null then
      select id into area_id from tag_areas where name = tag_name;
    end if;

    -- Create junction entries for all bookmarks with this tag
    for bm in
      select id from bookmarks where tag_name = any(tags)
    loop
      insert into bookmark_tags (bookmark_id, tag_area_id)
      values (bm.id, area_id)
      on conflict do nothing;
    end loop;
  end loop;
end;
$$;

-- 9. RLS policies
alter table tag_areas enable row level security;
create policy "Allow all on tag_areas" on tag_areas
  for all using (true) with check (true);

alter table bookmark_tags enable row level security;
create policy "Allow all on bookmark_tags" on bookmark_tags
  for all using (true) with check (true);

alter table status_history enable row level security;
create policy "Allow all on status_history" on status_history
  for all using (true) with check (true);
