import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Group {
  id: string;
  name: string;
  description: string;
  profile_pic_url: string | null;
  visibility: 'public' | 'private';
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  unread_count?: number;
  latest_message?: {
    content: string;
    created_at: string;
    sender_name: string;
  } | null;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
  profile?: {
    username: string;
    full_name: string;
    profile_pic_url: string | null;
  };
}

export function useGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's groups (both public and private they're members of)
  const fetchUserGroups = async () => {
    if (!user) return;

    try {
      // First get the group IDs where user is a member
      const { data: membershipData, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id, role, joined_at')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;

      if (!membershipData || membershipData.length === 0) {
        setGroups([]);
        return;
      }

      const groupIds = membershipData.map(m => m.group_id);

      // Then get the groups data
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('updated_at', { ascending: false });

      if (groupsError) throw groupsError;

      const processedGroups = groupsData.map((group: any) => ({
        ...group,
        member_count: 0, // Will be calculated separately if needed
        unread_count: 0, // Will be implemented after migration
        latest_message: null // Will be implemented after migration
      }));

      setGroups(processedGroups);
    } catch (err) {
      console.error('Error fetching user groups:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch groups');
    }
  };

  // Fetch public groups for discovery
  const fetchPublicGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const processedPublicGroups = data.map((group: any) => ({
        ...group,
        member_count: 0 // Will be calculated separately if needed
      }));

      setPublicGroups(processedPublicGroups);
    } catch (err) {
      console.error('Error fetching public groups:', err);
    }
  };

  // Create a new group
  const createGroup = async (groupData: {
    name: string;
    description: string;
    visibility: 'public' | 'private';
    profile_pic_url?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupData.name,
          description: groupData.description,
          visibility: groupData.visibility,
          profile_pic_url: groupData.profile_pic_url,
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      // Refresh groups list
      await fetchUserGroups();
      if (groupData.visibility === 'public') {
        await fetchPublicGroups();
      }

      return group;
    } catch (err) {
      console.error('Error creating group:', err);
      throw err;
    }
  };

  // Join a public group
  const joinGroup = async (groupId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member'
        });

      if (error) throw error;

      // Refresh groups list
      await fetchUserGroups();
    } catch (err) {
      console.error('Error joining group:', err);
      throw err;
    }
  };

  // Leave a group
  const leaveGroup = async (groupId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh groups list
      await fetchUserGroups();
    } catch (err) {
      console.error('Error leaving group:', err);
      throw err;
    }
  };

  // Get group members
  const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          profiles:user_id(username, full_name, profile_pic_url)
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      return data.map((member: any) => ({
        ...member,
        profile: member.profiles
      }));
    } catch (err) {
      console.error('Error fetching group members:', err);
      throw err;
    }
  };

  // Check if user is member of a group
  const isGroupMember = (groupId: string): boolean => {
    return groups.some(group => group.id === groupId);
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const groupsChannel = supabase
      .channel('groups-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'groups'
        },
        () => {
          fetchUserGroups();
          fetchPublicGroups();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members'
        },
        () => {
          fetchUserGroups();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages'
        },
        () => {
          fetchUserGroups(); // Refresh to update latest message and unread counts
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(groupsChannel);
    };
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await Promise.all([
          fetchUserGroups(),
          fetchPublicGroups()
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  return {
    groups,
    publicGroups,
    loading,
    error,
    createGroup,
    joinGroup,
    leaveGroup,
    getGroupMembers,
    isGroupMember,
    refreshGroups: fetchUserGroups,
    refreshPublicGroups: fetchPublicGroups
  };
}
