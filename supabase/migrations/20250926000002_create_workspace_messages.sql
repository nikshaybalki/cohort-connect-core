-- Create workspace_messages table for workspace chat functionality
CREATE TABLE IF NOT EXISTS public.workspace_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_urls JSONB DEFAULT '[]'::jsonb,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_messages_workspace_id ON workspace_messages(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_messages_sender ON workspace_messages(sender_id);

-- Enable RLS on workspace_messages table
ALTER TABLE workspace_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workspace_messages
CREATE POLICY "Workspace members can view workspace messages" 
ON workspace_messages FOR SELECT 
USING (
    workspace_id IN (
        SELECT w.id FROM workspaces w 
        JOIN group_members gm ON w.group_id = gm.group_id 
        WHERE gm.user_id = auth.uid()
    )
);

CREATE POLICY "Workspace members can send messages"
ON workspace_messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    workspace_id IN (
        SELECT w.id FROM workspaces w 
        JOIN group_members gm ON w.group_id = gm.group_id 
        WHERE gm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can edit their own workspace messages"
ON workspace_messages FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own workspace messages"
ON workspace_messages FOR DELETE
USING (auth.uid() = sender_id);