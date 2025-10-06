# Supabase Configuration

School of the Ancients now persists user data with Supabase so conversations, quests, and progress follow learners across devices. Follow these steps to provision and connect the backend.

## 1. Create a Supabase project
1. Visit [supabase.com](https://supabase.com) and create a new project.
2. Choose a strong password for the database and wait for provisioning to finish.
3. In the project dashboard open **Project Settings → API**. Copy the **Project URL** and **anon public key** &mdash; you will add these to `.env` shortly.

## 2. Define the `user_state` table
The frontend expects a single JSON record per user that captures conversations, quests, and progress. Create the table using the SQL editor in Supabase (or psql):

```sql
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

create policy "Users manage their own state"
  on public.user_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

> **Tip:** The table stores the entire serialized app state. Supabase handles JSONB efficiently, and schema migrations can reshape the payload over time.

## 3. Configure environment variables
Create (or update) your `.env` file in the repo root with the Gemini key plus Supabase credentials:

```bash
GEMINI_API_KEY=your_gemini_key
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Restart `npm run dev` after editing `.env` so Vite picks up the new variables.

## 4. Test the connection
1. Run `npm run dev` and visit the app.
2. Click **Sign in** in the top-right corner. Create an account (Supabase email/password auth) or sign in with an existing user.
3. Open the network tab; you should see `user_state` upsert calls as you finish conversations, create quests, or take quizzes.

If the modal reports that Supabase is not configured, double-check the environment variables. Authentication will stay disabled until both values are present.

## 5. Deploying
When deploying, set the same environment variables on your hosting platform. The frontend uses Supabase's JavaScript client directly, so no additional proxy is required.

---

With Supabase wired up you can remove the old `localStorage` bootstrapping code and trust the backend to keep learner progress consistent across sessions.
