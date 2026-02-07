-- =============================================
-- ContentDeck — Fix source detection
-- =============================================
-- Run this in Supabase SQL Editor to:
-- 1. Upgrade the trigger to case-insensitive matching
-- 2. Fix any existing misclassified bookmarks
-- =============================================

-- 1. Replace the trigger function with case-insensitive matching (~*)
create or replace function detect_source_type()
returns trigger as $$
begin
  if NEW.source_type is null or NEW.source_type = 'auto' or NEW.source_type = 'blog' then
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

-- 2. Fix any existing bookmarks that were misclassified
update bookmarks set source_type = 'youtube'
  where source_type = 'blog' and url ~* 'youtube\.com|youtu\.be|youtube\.app\.goo\.gl';

update bookmarks set source_type = 'twitter'
  where source_type = 'blog' and url ~* 'twitter\.com|x\.com|t\.co';

update bookmarks set source_type = 'linkedin'
  where source_type = 'blog' and url ~* 'linkedin\.com|lnkd\.in';

update bookmarks set source_type = 'substack'
  where source_type = 'blog' and url ~* 'substack\.com';
