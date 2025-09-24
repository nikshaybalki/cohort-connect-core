-- Fix group_messages RLS policy to allow group creators to send messages
-- even if they're not properly added to group_members table

DROP POLICY IF EXISTS "Group members can send messages" ON group_messages;

-- New policy that allows both group members AND group creators to send messages
CREATE POLICY "Group members and creators can send messages"
ON group_messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND (
        -- Case 1: User is in group_members table (normal case)
        group_id IN (
            SELECT group_id FROM group_members WHERE user_id = auth.uid()
        )
        OR
        -- Case 2: User is the group creator (fallback for when member addition fails)
        group_id IN (
            SELECT id FROM groups WHERE created_by = auth.uid()
        )
    )
);

-- Also update the SELECT policy to allow group creators to view messages
DROP POLICY IF EXISTS "Group members can view group messages" ON group_messages;

CREATE POLICY "Group members and creators can view group messages" 
ON group_messages FOR SELECT 
USING (
    -- Case 1: User is in group_members table (normal case)
    group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
    OR
    -- Case 2: User is the group creator (fallback for when member addition fails)
    group_id IN (
        SELECT id FROM groups WHERE created_by = auth.uid()
    )
);