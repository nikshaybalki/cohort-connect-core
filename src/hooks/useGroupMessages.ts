import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface GroupMessage {
  id: string;
  group_id: string;
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

export function useGroupMessages(groupId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Fetch messages for a specific group
  const fetchMessages = useCallback(async () => {
    if (!groupId || !user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select(`
          *,
          profiles:sender_id(
            id,
            username,
            full_name,
            profile_pic_url
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const processedMessages: GroupMessage[] = data.map((msg: any) => ({
        ...msg,
        media_urls: msg.media_urls || [],
        sender: {
          id: msg.profiles.id,
          username: msg.profiles.username,
          full_name: msg.profiles.full_name,
          profile_pic_url: msg.profiles.profile_pic_url
        }
      }));

      setMessages(processedMessages);
    } catch (err) {
      console.error('Error fetching group messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [groupId, user]);

  // Send a new message
  const sendMessage = async (content: string, mediaUrls: string[] = []) => {
    if (!groupId || !user || !content.trim()) return;

    setSending(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          sender_id: user.id,
          content: content.trim(),
          media_urls: mediaUrls
        })
        .select(`
          *,
          profiles:sender_id(
            id,
            username,
            full_name,
            profile_pic_url
          )
        `)
        .single();

      if (error) throw error;

      // The real-time subscription will handle adding the message to the list
      // But we can optimistically add it for immediate feedback
      const newMessage: GroupMessage = {
        ...data,
        media_urls: data.media_urls || [],
        sender: {
          id: data.profiles.id,
          username: data.profiles.username,
          full_name: data.profiles.full_name,
          profile_pic_url: data.profiles.profile_pic_url
        }
      };

      setMessages(prev => [...prev, newMessage]);

      // Update the group's updated_at timestamp
      await supabase
        .from('groups')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', groupId);

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    } finally {
      setSending(false);
    }
  };

  // Edit a message
  const editMessage = async (messageId: string, newContent: string) => {
    if (!user || !newContent.trim()) return;

    try {
      const { error } = await supabase
        .from('group_messages')
        .update({
          content: newContent.trim(),
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', user.id); // Ensure user can only edit their own messages

      if (error) throw error;

      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              content: newContent.trim(), 
              is_edited: true, 
              edited_at: new Date().toISOString() 
            }
          : msg
      ));
    } catch (err) {
      console.error('Error editing message:', err);
      setError(err instanceof Error ? err.message : 'Failed to edit message');
      throw err;
    }
  };

  // Delete a message
  const deleteMessage = async (messageId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('group_messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id); // Ensure user can only delete their own messages

      if (error) throw error;

      // Update local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete message');
      throw err;
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

  // Set up real-time subscription for messages
  useEffect(() => {
    if (!groupId || !user) return;

    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          // Fetch the complete message with sender info
          const { data, error } = await supabase
            .from('group_messages')
            .select(`
              *,
              profiles:sender_id(
                id,
                username,
                full_name,
                profile_pic_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            const newMessage: GroupMessage = {
              ...data,
              media_urls: data.media_urls || [],
              sender: {
                id: data.profiles.id,
                username: data.profiles.username,
                full_name: data.profiles.full_name,
                profile_pic_url: data.profiles.profile_pic_url
              }
            };

            // Only add if it's not already in the list (avoid duplicates from optimistic updates)
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (exists) return prev;
              return [...prev, newMessage];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          setMessages(prev => prev.map(msg => 
            msg.id === payload.new.id 
              ? { ...msg, ...payload.new }
              : msg
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, user]);

  // Fetch messages when groupId changes
  useEffect(() => {
    if (groupId) {
      fetchMessages();
    } else {
      setMessages([]);
      setError(null);
    }
  }, [groupId, fetchMessages]);

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    editMessage,
    deleteMessage,
    uploadMedia,
    refreshMessages: fetchMessages
  };
}
