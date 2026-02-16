# Phase 5: Ecosystem (v6.0)

> Goal: ContentDeck as the hub of your information diet.

## 5.1 Obsidian Plugin
- Bidirectional sync between ContentDeck and Obsidian
- Obsidian → ContentDeck: save links from your vault
- ContentDeck → Obsidian: auto-export on status change to "done"
- Uses Obsidian's plugin API (free to publish on community plugins)

## 5.2 Notion Integration
- Export bookmarks as Notion database entries
- Map: tags → Notion multi-select, notes → Notion blocks, status → Notion status
- Uses Notion API (free)
- One-time export or continuous sync

## 5.3 Readwise Integration
- Import Kindle highlights as notes on book-type bookmarks
- Sync article highlights from Readwise Reader
- Two-way: ContentDeck highlights → Readwise
- Uses Readwise API (requires Readwise subscription — optional integration)

## 5.4 Podcast Support
- Save podcast episode URLs (Spotify, Apple Podcasts, Overcast)
- Extract episode metadata: title, show name, duration, description
- Timestamp notes: "At 14:32 — interesting point about..."
- Source type: `podcast` added to schema

## 5.5 PDF & Document Support
- Upload PDFs to Supabase Storage (1GB free)
- Extract text via edge function (pdf-parse library)
- Inline PDF viewer in reader mode
- Highlight and annotate PDFs
- Source type: `document`

## 5.6 Research Paper Support
- Detect arXiv, Semantic Scholar, Google Scholar URLs
- Auto-fetch: title, authors, abstract, citation count
- BibTeX export for academic users
- Related papers via Semantic Scholar API (free, 100 req/sec)

## 5.7 GitHub Stars Import
- Import your GitHub starred repos as bookmarks
- Auto-tagged with repo language and topics
- Keep in sync: new stars auto-imported via webhook
- Great for developer audience

## 5.8 Hacker News / Reddit Save
- Browser extension detects HN/Reddit comment pages
- "Save with discussion" — saves URL + top comments as notes
- Captures the context around *why* something was interesting
