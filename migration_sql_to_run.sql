-- Step 1: Add visibility column to groups table
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS visibility VARCHAR(10) DEFAULT 'private' CHECK (visibility IN ('public', 'private'));

CREATE INDEX IF NOT EXISTS idx_groups_visibility ON public.groups(visibility);

-- Step 2: Create group_messages table
CREATE TABLE IF NOT EXISTS public.group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_urls JSONB DEFAULT '[]'::jsonb,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender ON group_messages(sender_id);

ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- Step 3: Helper functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_member(gid uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = gid AND gm.user_id = uid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_public(gid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.groups g
    WHERE g.id = gid AND g.visibility = 'public'
  );
$$;

-- Step 4: Fix group_members SELECT policy (prevents infinite recursion)
DROP POLICY IF EXISTS "Users can view group members for groups they belong to" ON public.group_members;
CREATE POLICY "Users can view group members for groups they belong to"
ON public.group_members FOR SELECT
USING (
  public.is_group_public(group_id)
  OR user_id = auth.uid()
  OR public.is_member(group_id, auth.uid())
);

-- Step 5: Update groups RLS policy for public/private visibility
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;
CREATE POLICY "Users can view groups they are members of or public groups" 
ON groups FOR SELECT 
USING (
    visibility = 'public' OR 
    id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
);

-- Step 6: Add RLS policies for group_messages
CREATE POLICY "Group members can view group messages" 
ON group_messages FOR SELECT 
USING (
    group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Group members can send messages"
ON group_messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can edit their own messages"
ON group_messages FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
ON group_messages FOR DELETE
USING (auth.uid() = sender_id);

-- Step 7: Update group_members INSERT policy for public groups
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
CREATE POLICY "Users can join groups" 
ON group_members FOR INSERT 
WITH CHECK (
    auth.uid() = user_id AND (
        -- Can join public groups
        group_id IN (SELECT id FROM groups WHERE visibility = 'public') OR
        -- Can be added to private groups by existing members with admin/moderator role
        group_id IN (
            SELECT group_id FROM group_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
        )
    )
);

-- Step 8: Create helper function for unread count
CREATE OR REPLACE FUNCTION get_group_unread_count(group_uuid UUID, user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    -- For now, return total message count as we don't have read tracking yet
    -- This can be enhanced later with a group_message_reads table
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM group_messages 
        WHERE group_id = group_uuid 
        AND created_at > COALESCE(
            (SELECT joined_at FROM group_members 
             WHERE group_id = group_uuid AND user_id = user_uuid), 
            NOW() - INTERVAL '7 days'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
