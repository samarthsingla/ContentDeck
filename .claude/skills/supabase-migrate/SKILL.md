---
name: supabase-migrate
description: Generate Supabase SQL migration files following project conventions.
disable-model-invocation: false
---

# Supabase Migration

Generate a SQL migration file for schema changes. Follows the conventions established in `sql/setup.sql`.

## Usage

`/supabase-migrate <description of what to add/change>`

## Conventions

Before generating, read `sql/setup.sql` to understand existing patterns:

### Table patterns
- UUIDs for primary keys: `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`
- Timestamps: `created_at TIMESTAMPTZ DEFAULT now()`
- All tables will need `user_id UUID REFERENCES auth.users(id)` once auth is added (Phase 1.1)

### Trigger patterns
- Source detection: `detect_source_type()` using `~*` (case-insensitive regex)
- Status tracking: `track_status_change()` logging to `status_history`
- YouTube detection must handle: `youtube.com`, `youtu.be`, `youtube.app.goo.gl`
- Twitter detection must handle: `twitter.com`, `x.com`, `t.co`
- LinkedIn detection must handle: `linkedin.com`, `lnkd.in`

### RLS patterns (for v3.0+)
```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own data" ON <table>
  FOR ALL USING (auth.uid() = user_id);
```

### Index patterns
- Always index `user_id` on all tables
- Use `GIN` for full-text search (`tsvector` columns)
- Use `ivfflat` for vector similarity (`pgvector` columns)

## Output

Generate a complete, runnable SQL file:

1. **Header comment**: Description, date, references to ENGINEERING-PLAN.md section
2. **Extensions**: `CREATE EXTENSION IF NOT EXISTS` for any needed extensions
3. **Tables**: New tables with all columns and constraints
4. **Indexes**: Performance indexes
5. **Triggers**: Any trigger functions and their bindings
6. **RLS**: Row-level security policies (if auth is enabled)
7. **Rollback comment**: Commented-out `DROP` statements at the bottom for easy rollback

Save the file as `sql/migrate_<number>_<description>.sql` (e.g., `sql/migrate_001_add_auth.sql`).

Also update `sql/setup.sql` if the migration adds tables that should be part of the base schema.
