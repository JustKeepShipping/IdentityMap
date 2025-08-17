--
-- Supabase database schema for the Identity Map application.
--
-- This script defines the tables, enum types, and row‑level security
-- policies required to support the core data model. Run this in
-- your Supabase project SQL editor before using the application.

-- Enable the UUID extension for generating primary keys
create extension if not exists "uuid-ossp";

-- Sessions table
create table if not exists public.sessions (
  id uuid primary key default uuid_generate_v4(),
  code varchar(8) not null unique,
  title text not null,
  facilitator_email text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Participants table
create table if not exists public.participant (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.sessions(id) on delete cascade,
  display_name text not null,
  is_visible boolean not null default false,
  consent_given boolean not null default false,
  user_id uuid,
  created_at timestamptz not null default now()
);

-- Enum types for lens and item type
create type if not exists lens_type as enum ('GIVEN','CHOSEN','CORE');
create type if not exists item_type as enum ('tag','text');

-- Identity items table
create table if not exists public.identity_item (
  id uuid primary key default uuid_generate_v4(),
  participant_id uuid references public.participant(id) on delete cascade,
  lens lens_type not null,
  type item_type not null,
  label text,
  value text not null,
  weight integer not null check (weight >= 1 and weight <= 3),
  created_at timestamptz not null default now()
);

-- Similarity cache table for storing precomputed scores
create table if not exists public.similarity_cache (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.sessions(id) on delete cascade,
  a_id uuid references public.participant(id) on delete cascade,
  b_id uuid references public.participant(id) on delete cascade,
  score_overall double precision,
  score_given double precision,
  score_chosen double precision,
  score_core double precision,
  breakdown_json jsonb,
  computed_at timestamptz not null default now(),
  unique(session_id, a_id, b_id)
);

-- Enable Row Level Security on all tables
alter table public.sessions enable row level security;
alter table public.participant enable row level security;
alter table public.identity_item enable row level security;
alter table public.similarity_cache enable row level security;

-- Session policies: allow authenticated users to select and insert
create policy public_read_sessions on public.sessions
  for select
  using (true);

create policy public_insert_sessions on public.sessions
  for insert
  with check (true);

-- Participant policies
-- Allow users to read their own participant record or any
-- visible participants in the same session
create policy participants_can_select_self_or_visible on public.participant
  for select
  using (
    (user_id = auth.uid()) OR
    (is_visible AND session_id in (
      select session_id from public.participant p2 where p2.user_id = auth.uid()
    ))
  );

-- Users can insert their own participant record
create policy participants_can_insert_self on public.participant
  for insert
  with check (user_id = auth.uid());

-- Users can update their own participant record
create policy participants_can_update_self on public.participant
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Allow inserting participants without an authenticated user. This
-- policy exists primarily for seeding or facilitator-created
-- participants. Real user inserts should be restricted by the
-- `participants_can_insert_self` policy.
create policy participants_public_insert on public.participant
  for insert
  with check (true);

-- Identity item policies
create policy identity_items_select_self_or_visible on public.identity_item
  for select
  using (
    participant_id in (select id from public.participant where user_id = auth.uid()) OR
    participant_id in (
      select id from public.participant
      where is_visible AND session_id in (
        select session_id from public.participant where user_id = auth.uid()
      )
    )
  );

create policy identity_items_insert_self on public.identity_item
  for insert
  with check (participant_id in (select id from public.participant where user_id = auth.uid()));

create policy identity_items_update_self on public.identity_item
  for update
  using (participant_id in (select id from public.participant where user_id = auth.uid()))
  with check (participant_id in (select id from public.participant where user_id = auth.uid()));

-- Allow inserting identity items without an authenticated user. Used
-- for seed scripts and facilitator actions.
create policy identity_items_public_insert on public.identity_item
  for insert
  with check (true);

-- Similarity cache policies
create policy similarity_cache_select_same_session on public.similarity_cache
  for select
  using (
    session_id in (
      select session_id from public.participant where user_id = auth.uid()
    )
  );

create policy similarity_cache_insert_any on public.similarity_cache
  for insert
  with check (true);