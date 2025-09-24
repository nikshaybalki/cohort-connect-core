-- FIX: Remove recursive RLS policy and create a simple one
-- The current policy is causing infinite recursion

-- Drop ALL existing policies on group_members
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Users can join groups or be added by admins" ON group_members;
DROP POLICY IF EXISTS "Simple group member insertion" ON group_members;
DROP POLICY IF EXISTS "Temporary - allow all member insertions" ON group_members;

-- Create a NON-RECURSIVE policy
-- This avoids the infinite recursion by not checking group_members table within the policy
CREATE POLICY "Non-recursive member insertion" 
ON group_members FOR INSERT 
WITH CHECK (
    -- Allow anyone to add themselves
    user_id = auth.uid()
    OR
    -- Allow if current user is creator of the group (no recursion - checks groups table only)
    EXISTS (
        SELECT 1 FROM groups 
        WHERE id = group_id 
        AND created_by = auth.uid()
    )
);

-- Also ensure we have a proper SELECT policy that doesn't cause recursion
DROP POLICY IF EXISTS "Users can view group members for groups they belong to" ON group_members;
DROP POLICY IF EXISTS "Group members are viewable by group members" ON group_members;

CREATE POLICY "Simple member viewing" 
ON group_members FOR SELECT 
USING (
    -- Users can see their own memberships
    user_id = auth.uid()
    OR
    -- Users can see members of groups they created
    EXISTS (
        SELECT 1 FROM groups 
        WHERE id = group_id 
        AND created_by = auth.uid()
    )
    OR
    -- Users can see members of public groups
    EXISTS (
        SELECT 1 FROM groups 
        WHERE id = group_id 
        AND visibility = 'public'
    )
);