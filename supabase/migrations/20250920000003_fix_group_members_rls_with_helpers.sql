-- Helper functions to avoid RLS recursion
create or replace function public.is_member(gid uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.group_members gm
    where gm.group_id = gid and gm.user_id = uid
  );
$$;

create or replace function public.is_group_public(gid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.groups g
    where g.id = gid and g.visibility = 'public'
  );
$$;

-- Recreate group_members SELECT policy using helper functions (prevents infinite recursion)
drop policy if exists "Users can view group members for groups they belong to" on public.group_members;
create policy "Users can view group members for groups they belong to"
on public.group_members for select
using (
  public.is_group_public(group_id)
  or user_id = auth.uid()
  or public.is_member(group_id, auth.uid())
);
