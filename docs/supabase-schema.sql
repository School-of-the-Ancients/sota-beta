-- Supabase schema for storing School of the Ancients data per authenticated user

create table if not exists custom_characters (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists custom_characters_user_created_idx
  on custom_characters (user_id, created_at desc);

create table if not exists conversations (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_updated_idx
  on conversations (user_id, updated_at desc);

create table if not exists completed_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, quest_id)
);

create index if not exists completed_quests_quest_idx
  on completed_quests (quest_id);

alter table custom_characters enable row level security;
alter table conversations enable row level security;
alter table completed_quests enable row level security;

create policy if not exists "Only owners manage custom characters" on custom_characters
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Only owners manage conversations" on conversations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Only owners manage completed quests" on completed_quests
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
