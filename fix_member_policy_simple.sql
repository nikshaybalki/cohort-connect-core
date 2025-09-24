-- Simple and reliable policy for group member addition
-- This will definitely work for group creators and admins

-- First, drop all existing problematic policies
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Users can join groups or be added by admins" ON group_members;
DROP POLICY IF EXISTS "Allow group member operations" ON group_members;

-- Create a very simple policy that allows:
-- 1. Anyone to add themselves (user_id = auth.uid())
-- 2. Group creators to add anyone to their groups
-- 3. Admins to add anyone to groups they admin
CREATE POLICY "Simple group member insertion" 
ON group_members FOR INSERT 
WITH CHECK (
    -- Case 1: User adding themselves
    user_id = auth.uid()
    OR
    -- Case 2: Group creator can add anyone to their group
    EXISTS (
        SELECT 1 FROM groups g 
        WHERE g.id = group_id 
        AND g.created_by = auth.uid()
    )
    OR
    -- Case 3: Current user is admin of this group
    EXISTS (
        SELECT 1 FROM group_members gm 
        WHERE gm.group_id = group_id 
        AND gm.user_id = auth.uid() 
        AND gm.role = 'admin'
    )
);