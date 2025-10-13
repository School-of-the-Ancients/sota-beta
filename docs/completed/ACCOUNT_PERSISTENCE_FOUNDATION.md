# Phase 1: Account & Persistence Foundation (Issue #111)

This document captures the implementation details for the first phase of the Issue Prioritization plan: migrating the School of the Ancients beta from local-only state to Supabase-backed authentication and persistence.

## Architecture & Provider Selection

- **Backend provider:** Supabase was selected because it pairs Postgres with battle-tested auth (Google OAuth out of the box), JSON storage, real-time subscriptions, and a generous hobby tier that matches the beta's needs.
- **Frontend integration:** Two React context providers wrap the entire app:
  - `SupabaseAuthProvider` (`hooks/useSupabaseAuth.tsx`) exposes the current session, loading state, and `signIn`/`signOut` helpers.
  - `UserDataProvider` (`hooks/useUserData.tsx`) keeps the user profile (`UserData`) in sync with Supabase, handles optimistic updates, and saves automatically when any slice of data changes.
- **Session persistence:** The Supabase client (`supabaseClient.ts`) enables built-in session storage with a dedicated key (`sota-auth-session`) so refreshes and multi-tab usage remain seamless.
- **UI entry point:** `App.tsx` renders a **Sign in** button in the top-right corner. When a user is unauthenticated and tries to start a conversation, open history, or manage quests, the app triggers `requireAuth`, surfaces a friendly prompt, and opens the Supabase OAuth flow.

## Data Modeling

Phase 1 tracks all per-user state in a single row for simplicity while leaving headroom for Phase 2's curriculum tables.

```sql
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  migrated_at timestamptz
);
```

The `data` document stores the serialized `UserData` TypeScript shape:

- `customCharacters: Character[]`
- `customQuests: Quest[]`
- `conversations: SavedConversation[]`
- `completedQuestIds: string[]`
- `activeQuestId: string | null`
- `lastQuizResult: QuizResult | null`
- `migratedAt: string | null`

This mirrors the existing front-end state, allowing us to add columns/tables later without rewriting the UI. `migratedAt` stamps the moment a user's local storage snapshot is first synced.

### Migration from Local Storage

`UserDataProvider` performs a one-time migration when a signed-in user loads the app:

1. Collects any legacy keys (`school-of-the-ancients-*`).
2. Merges them with the remote Supabase document, preferring remote state when conflicts occur.
3. Persists the merged document via `saveUserData`.
4. Clears the legacy keys to prevent drift.

If no Supabase credentials are configured (e.g., during storybook or offline development), the provider falls back to the default empty profile without attempting to read/write remote data.

## API & Integration Flow

- `fetchUserData(userId)` reads the JSON payload and `migrated_at` from Supabase. Missing rows are auto-created with `DEFAULT_USER_DATA`.
- `saveUserData(userId, payload)` upserts the JSON blob and `migrated_at` timestamp. Optimistic updates keep the UI responsive while the async call resolves.
- `App.tsx` orchestrates higher-level features:
  - `requireAuth` defers any restricted action until the user is signed in.
  - Views like `ConversationView`, `HistoryView`, `QuestsView`, `QuestCreator`, and `CharacterCreator` mutate state via `updateData`, which streams changes to Supabase.
  - Gated flows show inline prompts ("Sign in to continue your journey through history") when unauthenticated.
- Tests (`App.test.tsx`, `tests/components/ConversationView.test.tsx`) mock both providers to validate quest gating, migrations, and history interactions without touching the network.

## Security, Compliance & Operations

- **Row Level Security:** Enable RLS on `public.user_data` and add policies granting each user access only to their row:
  ```sql
  alter table public.user_data enable row level security;
  create policy "Users can manage their own data" on public.user_data
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  ```
- **OAuth providers:** Google OAuth is enabled in Supabase. Additional providers (Microsoft, Apple) can be switched on without code changes.
- **Environment variables:** Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` locally (.env) and in deployment secrets. Never commit keys; rotate the anon key if it leaks.
- **Deployment hooks:** Use Supabase migrations or SQL snippets committed to `supabase/migrations` to keep environments in sync. CI/CD should run `supabase db push` (or apply SQL via the dashboard) before deploying the front-end bundle.
- **Audit logging:** Supabase automatically captures authentication events. For extra coverage, enable the Logs Explorer retention plan and configure alerts on sign-in failure spikes.
- **Rate limiting:** Supabase REST RPC inherits PostgREST defaults. For this phase, per-user access is naturally throttled by the JSON blob size, but you can layer edge functions or WAF rules if abuse appears.

## Developer Onboarding Checklist

1. Create a Supabase project (free tier is sufficient).
2. Enable Google OAuth in **Authentication → Providers** and copy the client ID/secret.
3. Add site URLs (http://localhost:3000 and production origin) to the Supabase redirect whitelist.
4. Run the `user_data` table migration (above) and enable the RLS policy.
5. Populate `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
6. Start the app (`npm run dev`), click **Sign in**, and verify the Supabase OAuth flow completes.
7. Exercise quest creation/history to ensure data persists across refreshes and devices.

This foundation unlocks Issue #118 and subsequent roadmap work by delivering authenticated persistence, migration tooling, and documented security controls.
