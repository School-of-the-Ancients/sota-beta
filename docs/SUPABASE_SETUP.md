# Supabase Setup & Account Sync Guide

_Phase 1 deliverable for Issue #111_

This document explains how to configure Supabase so that School of the Ancients can authenticate users, sync quest progress, and migrate data previously stored in `localStorage`.

## 1. Environment Variables

Create (or update) the project `.env` file with the following entries:

```bash
GEMINI_API_KEY=your_gemini_key
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_public_anon_key
```

Restart `npm run dev` whenever these values change. The Vite build will expose the Supabase values to the browser at runtime.

## 2. Database Schema

Create a table to hold per-user quest state snapshots. Run the SQL below in the Supabase SQL editor (replace the schema name if you use something other than `public`).

```sql
create table if not exists public.user_state_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  history jsonb not null default '[]'::jsonb,
  completed_quest_ids text[] not null default '{}',
  custom_characters jsonb not null default '[]'::jsonb,
  custom_quests jsonb not null default '[]'::jsonb,
  active_quest_id text,
  last_quiz_result jsonb,
  updated_at timestamptz not null default now()
);
```

> **Tip:** You can expand this table later with additional analytics columns (e.g., mastery streaks) without disrupting the current client integration.

## 3. Row-Level Security (RLS)

Enable RLS on the table and add policies so each user can only touch their own row:

```sql
alter table public.user_state_snapshots enable row level security;

create policy "Allow users to select their snapshot" on public.user_state_snapshots
  for select
  using (auth.uid() = user_id);

create policy "Allow users to upsert their snapshot" on public.user_state_snapshots
  for insert
  with check (auth.uid() = user_id);

create policy "Allow users to update their snapshot" on public.user_state_snapshots
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

> The client only performs `upsert` calls, but explicit `insert`/`update` policies provide clearer audit trails and future flexibility.

## 4. OAuth Provider Configuration

1. In the Supabase dashboard, open **Authentication → Providers**.
2. Enable **Google** (or your chosen OAuth provider) and supply the client ID/secret.
3. Set the **Redirect URL** to the Vite origin you use locally (e.g., `http://localhost:3000`) and any deployed origins.
4. Optional: enable **GitHub** as a secondary provider. The frontend exposes a hook for a GitHub flow if you pass `'github'` to `signInWithProvider`.

## 5. Local Development Workflow

- When Supabase credentials are present, the app shows a **Sign in** button in the top-right corner and gates quests until the user authenticates.
- After the first successful login, the client loads the user's existing snapshot (if any), writes it into local cache, and updates in-memory state.
- Every subsequent mutation (saving a conversation, finishing a quest, editing custom characters) triggers a debounced `upsert` to Supabase.
- If Supabase is not configured, the UI falls back to the previous offline-only behavior so the development experience remains smooth.

## 6. Migrating Existing Users

For early adopters who used the pre-auth build:

1. Ask them to log in with the new OAuth flow.
2. On first load, the app automatically pushes their cached `localStorage` data to Supabase.
3. If you need to bulk migrate historical `localStorage` dumps, insert JSON directly into `user_state_snapshots` with the `user_id` you receive from Supabase.

## 7. Operational Notes

- Supabase real-time sync is not yet enabled; the UI relies on manual refresh or event-driven updates.
- Consider enabling **Point-in-Time Recovery** and backups if you rely on this data for assessments.
- Monitor the `user_state_snapshots` table size—storing full transcripts can grow quickly. Future phases may move transcripts to a dedicated table or storage bucket.

With these steps complete, School of the Ancients now satisfies Phase 1 of the implementation plan: authenticated sessions with cloud persistence.
