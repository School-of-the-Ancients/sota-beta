-- Supabase schema for School of the Ancients user data

-- Custom mentor personas created by learners
create table if not exists custom_characters (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  character jsonb not null,
  created_at timestamptz not null default now()
);

alter table custom_characters enable row level security;
create policy "custom_characters_access" on custom_characters
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Conversation transcripts, summaries, and quest assessments
create table if not exists conversations (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table conversations enable row level security;
create policy "conversations_access" on conversations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Quest completion tracking
create table if not exists completed_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, quest_id)
);

alter table completed_quests enable row level security;
create policy "completed_quests_access" on completed_quests
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
