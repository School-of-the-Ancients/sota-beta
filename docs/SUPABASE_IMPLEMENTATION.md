# Supabase Implementation Guide

This document captures the Phase 1 authentication & persistence work for School of the Ancients. It explains how Supabase is
used, which tables and policies are required, and how the frontend behaves for both authenticated and local-only visitors.

## Overview

- **Authentication**: Users sign in with Supabase Email OTP (magic link). Sessions persist client-side via the Supabase JS
  client, and the UI shows a `Sign In` button in the top-right corner of the app.
- **Persistence**: When signed in, conversation history, quest progress, custom quests/characters, active quest state, and
  the last quiz result are stored in a single JSON document per user.
- **Fallback**: If Supabase credentials are missing or the user is anonymous, the app transparently falls back to the previous
  `localStorage` implementation.

## Environment Variables

Add the following variables to `.env` (and deployment secrets). Vite injects them at build time:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

> Keep the service role key out of the client bundle. The anon key is sufficient for the browser.

## Database Schema

Create a single table to hold each user's application state snapshot:

```sql
create table if not exists public.user_states (
  user_id uuid primary key references auth.users on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_states enable row level security;

create policy "Users can manage their own state"
  on public.user_states
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Recommended extras:

- Add a trigger to bump `updated_at` on every update if you want Postgres-managed timestamps.
- Enable point-in-time restore or PITR on the project so you can recover user state if necessary.

## Stored JSON Shape

The `state` column contains:

```ts
interface PersistedState {
  conversations: SavedConversation[];
  completedQuestIds: string[];
  customQuests: Quest[];
  customCharacters: Character[];
  activeQuestId: string | null;
  lastQuizResult: QuizResult | null;
}
```

All arrays default to `[]` and nullable values default to `null` when the document is missing a property.

## Frontend Behaviour

- On app load the Supabase client attempts to restore the current session (`supabase.auth.getSession`).
- The UI displays a `Sign In` button in the header. When clicked, it opens a modal prompting for email and sends a magic link via
  `supabase.auth.signInWithOtp`.
- After the user completes the magic link flow, the app fetches `user_states.state`. If the row is empty, any existing
  `localStorage` data is migrated into Supabase and the local copy is cleared.
- Every time conversations, quests, characters, quiz results, or active quest data changes, the app debounces an `upsert`
  to `user_states`. Writes are batched every ~300ms to avoid spamming the database during rapid interactions.
- When Supabase is unavailable (no env vars or network error) or the user stays anonymous, `localStorage` continues to power
  persistence and the UI indicates that cloud sync is disabled.
- Actions that mutate persistence (starting conversations, editing quests/characters, etc.) prompt the user to sign in first.
  Deferred actions resume automatically once authentication completes.

## Testing & Local Development

- The Supabase client gracefully handles the absence of env vars, so automated tests can run without a Supabase project. The
  UI exposes "Auth unavailable" in this mode and uses `localStorage`.
- For end-to-end testing against a real Supabase instance, create a dedicated project and service role key, then seed test data
  by inserting JSON documents into `public.user_states`.

## Security Checklist

- RLS is mandatory. The provided policy allows users to insert, update, and delete only their own rows.
- Consider enabling email domain restrictions or additional providers (OAuth) depending on your rollout plan.
- Monitor Supabase logs for signs of abuse (e.g., automated write floods) and add rate limiting if necessary.
- Keep Supabase keys in your secret manager and rotate them if exposed.

## Migration Notes

- The migration from `localStorage` happens automatically the first time a user signs in. Ensure your privacy policy and release
  notes communicate this behaviour so users know their historical data is moved to the cloud.
- If you had multiple browser profiles storing different data, each Supabase account will only import the data present on the
  device used during the initial sign-in.

With Supabase in place, the project has a foundation for multi-device sync, future curriculum intelligence, and shared content
libraries described in the roadmap.
