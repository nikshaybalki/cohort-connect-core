-- Fix group_members INSERT policy to allow admins to add other users
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
CREATE POLICY "Users can join groups or be added by admins" 
ON group_members FOR INSERT 
WITH CHECK (
    -- Case 1: User adding themselves to public groups
    (auth.uid() = user_id AND group_id IN (SELECT id FROM groups WHERE visibility = 'public')) OR
    
    -- Case 2: User adding themselves to any group they have permission to join
    (auth.uid() = user_id) OR
    
    -- Case 3: Admin/moderators can add others to groups they are admin/moderator of
    (group_id IN (
        SELECT group_id FROM group_members 
        WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )) OR
    
    -- Case 4: Group creators can add anyone to their groups
    (group_id IN (
        SELECT id FROM groups WHERE created_by = auth.uid()
    ))
);