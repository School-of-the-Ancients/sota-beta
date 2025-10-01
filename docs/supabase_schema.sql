-- Enable row level security for user-scoped data tables.

create table if not exists custom_characters (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  character jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id text not null,
  character_name text not null,
  portrait_url text not null,
  occurred_at timestamptz not null default now(),
  transcript jsonb not null default '[]'::jsonb,
  environment_image_url text,
  summary jsonb,
  quest_id text,
  quest_title text,
  quest_assessment jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists completed_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, quest_id)
);

alter table custom_characters enable row level security;
alter table conversations enable row level security;
alter table completed_quests enable row level security;

create policy "Users manage their custom characters"
  on custom_characters
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their conversations"
  on conversations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their quest progress"
  on completed_quests
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists conversations_user_occurred_at_idx on conversations (user_id, occurred_at desc);
create index if not exists custom_characters_user_created_at_idx on custom_characters (user_id, created_at desc);
