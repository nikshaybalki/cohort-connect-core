-- TEMPORARY: Very permissive policy for testing
-- Use this if the simple policy above still doesn't work

DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Users can join groups or be added by admins" ON group_members;
DROP POLICY IF EXISTS "Allow group member operations" ON group_members;
DROP POLICY IF EXISTS "Simple group member insertion" ON group_members;

-- Completely open policy for testing (TEMPORARY ONLY)
CREATE POLICY "Test - allow all member insertions" 
ON group_members FOR INSERT 
WITH CHECK (true);

-- NOTE: Remember to replace this with a proper policy later for security!