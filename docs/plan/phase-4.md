# Phase 4: Social & Scale (v5.0)

> Goal: From personal tool to community platform.

## 4.1 Public Reading Lists
- Toggle any tag area to "public" → generates a shareable URL
- `/u/username/area-name` — beautiful public page
- OG meta tags per list (dynamic via edge function)
- Anyone can view, only owner can edit
- "Copy to my library" button for viewers

## 4.2 User Profiles
- `/u/username` — public profile page
- Reading stats (opt-in): books read this year, articles completed, streak
- Pinned collections
- "Follow" button → get notified when they publish a new list

## 4.3 Discover Feed
- Curated feed of popular public bookmarks across all users
- Trending: most-saved URLs in the last 7 days
- Categories: filtered by source type or tag
- "Save to my library" one-click action
- Moderation: report button + admin flag system

## 4.4 Collaborative Collections
- Invite others to contribute to a shared tag area
- Real-time sync via Supabase Realtime
- Activity log: "Alice added 3 bookmarks to Design"
- Use case: team reading lists, study groups, content curation

## 4.5 Weekly Digest Email
- Automated weekly email with:
  - Reading stats (completed, streak)
  - Oldest unread bookmarks ("these have been waiting 30+ days")
  - AI-generated topic summary ("This week you focused on...")
- Sent via Supabase Edge Function + Resend (free tier: 100 emails/day)
- Configurable: daily/weekly/off

## 4.6 Achievements & Gamification
- Reading milestones: "Read 100 articles", "7-day streak", "Completed a book"
- Source diversity: "Explored all 6 source types"
- Export badges: "Exported 50 bookmarks to Obsidian"
- Displayed on profile, shareable as images
- Motivates consistent reading habits
