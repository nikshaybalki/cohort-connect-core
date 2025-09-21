-- Drop the problematic policy completely
DROP POLICY IF EXISTS "Users can view group members for groups they belong to" ON public.group_members;

-- Create a simple, non-recursive policy
CREATE POLICY "Users can view group members simple"
ON public.group_members FOR SELECT
USING (
  -- Users can always see their own memberships
  user_id = auth.uid()
  OR
  -- Users can see members of public groups (direct table access, no recursion)
  EXISTS (
    SELECT 1 FROM public.groups g 
    WHERE g.id = group_members.group_id 
    AND g.visibility = 'public'
  )
);

-- Also ensure the groups policy is correct
DROP POLICY IF EXISTS "Users can view groups they are members of or public groups" ON public.groups;
CREATE POLICY "Users can view groups they are members of or public groups" 
ON public.groups FOR SELECT 
USING (
    visibility = 'public' 
    OR 
    EXISTS (
        SELECT 1 FROM public.group_members gm 
        WHERE gm.group_id = groups.id 
        AND gm.user_id = auth.uid()
    )
);
