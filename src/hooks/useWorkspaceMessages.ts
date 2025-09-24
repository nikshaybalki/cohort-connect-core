import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface WorkspaceMessage {
  id: string;
  workspace_id: string;
  sender_id: string;
  content: string;
  media_urls: string[];
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  sender: {
    id: string;
    username: string;
    full_name: string;
    profile_pic_url: string | null;
  };
}

export function useWorkspaceMessages(workspaceId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // For now, simulate messages since we need to apply migrations first
  const fetchMessages = useCallback(async () => {
    if (!workspaceId || !user) return;

    setLoading(true);
    setError(null);

    try {
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Return empty array for now - will be implemented after migration
      setMessages([]);
    } catch (err) {
      console.error('Error fetching workspace messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, user]);

  // Send a new message
  const sendMessage = async (content: string, mediaUrls: string[] = []) => {
    if (!workspaceId || !user || !content.trim()) return;

    setSending(true);
    setError(null);

    try {
      // Simulate sending - will be implemented after migration
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const newMessage: WorkspaceMessage = {
        id: Date.now().toString(),
        workspace_id: workspaceId,
        sender_id: user.id,
        content: content.trim(),
        media_urls: mediaUrls,
        is_edited: false,
        edited_at: null,
        created_at: new Date().toISOString(),
        sender: {
          id: user.id,
          username: user.user_metadata?.username || 'User',
          full_name: user.user_metadata?.full_name || 'User',
          profile_pic_url: user.user_metadata?.profile_pic_url || null
        }
      };

      setMessages(prev => [...prev, newMessage]);

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    } finally {
      setSending(false);
    }
  };

  // Upload media files
  const uploadMedia = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    try {
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading media:', err);
      throw err;
    }
  };

  // Fetch messages when workspaceId changes
  useEffect(() => {
    if (workspaceId) {
      fetchMessages();
    } else {
      setMessages([]);
      setError(null);
    }
  }, [workspaceId, fetchMessages]);

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    uploadMedia,
    refreshMessages: fetchMessages
  };
}