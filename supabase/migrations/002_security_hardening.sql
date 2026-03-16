-- Security hardening for policies used by current client flows.

-- Drop minimal policies from v1 migration.
drop policy if exists "profiles_select" on public.user_profiles;
drop policy if exists "profiles_upsert" on public.user_profiles;
drop policy if exists "profiles_update" on public.user_profiles;

drop policy if exists "groups_select" on public.groups;
drop policy if exists "groups_insert" on public.groups;

drop policy if exists "group_members_select" on public.group_members;
drop policy if exists "group_members_insert" on public.group_members;

drop policy if exists "events_select" on public.events;
drop policy if exists "events_insert" on public.events;

drop policy if exists "participants_select" on public.event_participants;
drop policy if exists "participants_insert" on public.event_participants;

-- Profiles: any authenticated user can read basic profile info for event/group UX;
-- only owners can insert/update their own row.
create policy "profiles_select_authenticated" on public.user_profiles
  for select using (auth.uid() is not null);

create policy "profiles_insert_self" on public.user_profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_self" on public.user_profiles
  for update using (auth.uid() = id);

-- Groups: visible only to members/owners.
create policy "groups_select_member_or_owner" on public.groups
  for select using (
    auth.uid() = owner_id
    or exists (
      select 1
      from public.group_members gm
      where gm.group_id = id
        and gm.user_id = auth.uid()
    )
  );

create policy "groups_insert_owner" on public.groups
  for insert with check (auth.uid() = owner_id);

create policy "groups_update_owner" on public.groups
  for update using (auth.uid() = owner_id);

create policy "groups_delete_owner" on public.groups
  for delete using (auth.uid() = owner_id);

-- Group members: allow self-view and visibility of members in groups you belong to.
create policy "group_members_select_related" on public.group_members
  for select using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.group_members gm
      where gm.group_id = group_id
        and gm.user_id = auth.uid()
    )
  );

-- Insert allowed for owner adding members or user joining themselves.
create policy "group_members_insert_owner_or_self" on public.group_members
  for insert with check (
    (auth.uid() = user_id)
    or exists (
      select 1
      from public.groups g
      where g.id = group_id
        and g.owner_id = auth.uid()
    )
  );

create policy "group_members_delete_owner_or_self" on public.group_members
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.groups g
      where g.id = group_id
        and g.owner_id = auth.uid()
    )
  );

-- Events: readable only by group members; editable only by creator.
create policy "events_select_group_member" on public.events
  for select using (
    exists (
      select 1
      from public.group_members gm
      where gm.group_id = group_id
        and gm.user_id = auth.uid()
    )
  );

create policy "events_insert_creator" on public.events
  for insert with check (
    auth.uid() = created_by
    and exists (
      select 1
      from public.group_members gm
      where gm.group_id = group_id
        and gm.user_id = auth.uid()
    )
  );

create policy "events_update_creator" on public.events
  for update using (auth.uid() = created_by);

create policy "events_delete_creator" on public.events
  for delete using (auth.uid() = created_by);

-- Participants: readable by event group members; insert only for self;
-- delete by self or event creator.
create policy "participants_select_group_member" on public.event_participants
  for select using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.events e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = event_id
        and gm.user_id = auth.uid()
    )
  );

create policy "participants_insert_self" on public.event_participants
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.events e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = event_id
        and gm.user_id = auth.uid()
    )
  );

create policy "participants_delete_self_or_event_creator" on public.event_participants
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.created_by = auth.uid()
    )
  );
