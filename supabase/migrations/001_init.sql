-- Core schema for Bokacourt scaffold.

create extension if not exists "uuid-ossp";

do $$ begin
  create type event_type as enum ('individual', 'couples');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type participant_status as enum ('confirmed', 'waitlisted');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type slot_type as enum ('individual', 'couple');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type member_role as enum ('owner', 'member');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar text,
  bio text,
  location text,
  skill_level text,
  preferred_court text,
  availability jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  owner_id uuid references auth.users(id),
  invite_token uuid not null default uuid_generate_v4(),
  created_at timestamp with time zone default now()
);

create table if not exists public.group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role member_role default 'member',
  created_at timestamp with time zone default now(),
  unique (group_id, user_id)
);

create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups(id) on delete cascade,
  created_by uuid references auth.users(id),
  date_time timestamp with time zone not null,
  max_participants integer not null,
  description text,
  type event_type default 'individual',
  created_at timestamp with time zone default now()
);

create table if not exists public.event_participants (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status participant_status default 'confirmed',
  slot_type slot_type default 'individual',
  partner_name text,
  partner_profile_id uuid references auth.users(id),
  joined_at timestamp with time zone default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, display_name, username)
  values (new.id, new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.user_profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;

-- Minimal policies. Tighten these before production.
drop policy if exists "profiles_select" on public.user_profiles;
create policy "profiles_select" on public.user_profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_upsert" on public.user_profiles;
create policy "profiles_upsert" on public.user_profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update" on public.user_profiles;
create policy "profiles_update" on public.user_profiles
  for update using (auth.uid() = id);

drop policy if exists "groups_select" on public.groups;
create policy "groups_select" on public.groups
  for select using (true);

drop policy if exists "groups_insert" on public.groups;
create policy "groups_insert" on public.groups
  for insert with check (auth.uid() is not null);

drop policy if exists "group_members_select" on public.group_members;
create policy "group_members_select" on public.group_members
  for select using (auth.uid() = user_id);

drop policy if exists "group_members_insert" on public.group_members;
create policy "group_members_insert" on public.group_members
  for insert with check (auth.uid() = user_id);

drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events
  for select using (true);

drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events
  for insert with check (auth.uid() = created_by);

drop policy if exists "participants_select" on public.event_participants;
create policy "participants_select" on public.event_participants
  for select using (auth.uid() = user_id);

drop policy if exists "participants_insert" on public.event_participants;
create policy "participants_insert" on public.event_participants
  for insert with check (auth.uid() = user_id);

