-- Fix recursive RLS evaluation between public.group_members and public.groups.
-- Error seen: 42P17 infinite recursion detected in policy for relation "group_members".

-- Replace policies that can recurse through cross-table RLS checks.
drop policy if exists "groups_select_member_or_owner" on public.groups;
drop policy if exists "group_members_select_related" on public.group_members;

-- Keep groups readable to authenticated users to avoid policy cycles during embeds.
-- Membership control remains enforced by group_members/event policies.
drop policy if exists "groups_select_authenticated" on public.groups;
create policy "groups_select_authenticated" on public.groups
  for select using (auth.uid() is not null);

-- Allow users to see their own membership rows and owners to see memberships
-- for groups they own (no self-reference to group_members table).
drop policy if exists "group_members_select_self_or_owner" on public.group_members;
create policy "group_members_select_self_or_owner" on public.group_members
  for select using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.groups g
      where g.id = group_id
        and g.owner_id = auth.uid()
    )
  );
