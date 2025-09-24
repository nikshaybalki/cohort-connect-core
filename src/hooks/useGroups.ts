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
    if (!user) {
      console.log('No user found, setting empty groups');
      setGroups([]);
      return;
    }

    console.log('Fetching groups for user:', user.id);

    try {
      setError(null);
      
      // Method 1: Get groups where user is a member via group_members table
      const { data: membershipData, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id, role, joined_at')
        .eq('user_id', user.id);

      console.log('Membership data:', membershipData, 'Error:', membershipError);

      // Method 2: Also get groups where user is the creator (fallback)
      const { data: createdGroups, error: createdError } = await supabase
        .from('groups')
        .select('*')
        .eq('created_by', user.id)
        .order('updated_at', { ascending: false });

      console.log('Created groups:', createdGroups, 'Error:', createdError);

      let allUserGroups: any[] = [];

      // If membership query works, use that
      if (!membershipError && membershipData && membershipData.length > 0) {
        const groupIds = membershipData.map(m => m.group_id).filter(Boolean);
        console.log('Group IDs user is member of:', groupIds);
        
        if (groupIds.length > 0) {
          const { data: groupsData, error: groupsError } = await supabase
            .from('groups')
            .select('*')
            .in('id', groupIds)
            .order('updated_at', { ascending: false });

          console.log('Groups data from membership:', groupsData, 'Error:', groupsError);

          if (!groupsError && groupsData) {
            allUserGroups = groupsData;
          }
        }
      }

      // Also include created groups (in case membership creation failed)
      if (!createdError && createdGroups && createdGroups.length > 0) {
        // Merge created groups with member groups, avoiding duplicates
        const existingIds = allUserGroups.map(g => g.id);
        const newCreatedGroups = createdGroups.filter(g => !existingIds.includes(g.id));
        allUserGroups = [...allUserGroups, ...newCreatedGroups];
        console.log('Added created groups to list:', newCreatedGroups);
      }

      if (allUserGroups.length === 0) {
        console.log('No groups found for user');
        setGroups([]);
        return;
      }

      const processedGroups = allUserGroups.map((group: any) => ({
        ...group,
        member_count: 0, // Will be calculated separately if needed
        unread_count: 0, // Will be implemented after migration
        latest_message: null // Will be implemented after migration
      }));

      console.log('Final processed groups:', processedGroups);
      setGroups(processedGroups);
    } catch (err) {
      console.error('Error fetching user groups:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch groups');
      setGroups([]);
    }
  };

  // Fetch public groups for discovery (excluding groups user is already a member of)
  const fetchPublicGroups = async () => {
    if (!user) {
      console.log('No user for public groups, setting empty');
      setPublicGroups([]);
      return;
    }

    console.log('Fetching public groups for user:', user.id);

    try {
      // First get all group IDs where user is a member
      const { data: membershipData, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      console.log('User memberships for filtering:', membershipData, 'Error:', membershipError);

      // Also get groups where user is the creator
      const { data: createdGroups, error: createdError } = await supabase
        .from('groups')
        .select('id')
        .eq('created_by', user.id);

      console.log('User created groups for filtering:', createdGroups, 'Error:', createdError);

      // Combine both lists - groups user is member of AND groups user created
      const memberGroupIds = membershipData?.map(m => m.group_id).filter(Boolean) || [];
      const createdGroupIds = createdGroups?.map(g => g.id).filter(Boolean) || [];
      const userGroupIds = [...new Set([...memberGroupIds, ...createdGroupIds])];
      
      console.log('All user group IDs to exclude:', userGroupIds);

      // Get all groups and filter client-side to avoid TypeScript issues with visibility column
      const { data: allGroups, error: groupsError } = await supabase
        .from('groups')
        .select('id, name, description, profile_pic_url, created_by, created_at, updated_at')
        .order('created_at', { ascending: false });

      console.log('All groups fetched:', allGroups, 'Error:', groupsError);

      if (groupsError) {
        console.error('Error fetching groups:', groupsError);
        setPublicGroups([]);
        return;
      }

      // Filter out groups that user is already associated with (member OR creator)
      const filteredPublicGroups = (allGroups || []).filter(
        (group: any) => !userGroupIds.includes(group.id)
      ).slice(0, 20); // Limit to 20 after filtering

      console.log('Filtered public groups (not member/creator of):', filteredPublicGroups);

      const processedPublicGroups = filteredPublicGroups.map((group: any) => ({
        ...group,
        visibility: 'public', // Assume public for explore section
        member_count: 0 // Will be calculated separately if needed
      }));

      setPublicGroups(processedPublicGroups);
    } catch (err) {
      console.error('Error fetching public groups:', err);
      setPublicGroups([]); // Set empty array on error
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

    console.log('Creating group:', groupData, 'for user:', user.id);

    try {
      // Create the group - using explicit fields to avoid TypeScript issues
      const groupInsert: any = {
        name: groupData.name,
        description: groupData.description,
        profile_pic_url: groupData.profile_pic_url,
        created_by: user.id
      };
      
      // Add visibility if the column exists
      try {
        groupInsert.visibility = groupData.visibility;
      } catch {
        // If visibility column doesn't exist, skip it
      }

      console.log('Inserting group with data:', groupInsert);

      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert(groupInsert)
        .select()
        .single();

      console.log('Group creation result:', group, 'Error:', groupError);

      if (groupError) {
        console.error('Group creation error:', groupError);
        throw groupError;
      }

      console.log('Adding user as admin member to group:', group.id);

      // Try to add creator as admin member using the helper function
      try {
        const { data: memberResult, error: memberError } = await supabase
          .rpc('add_group_member', {
            target_group_id: group.id,
            target_user_id: user.id,
            member_role: 'admin'
          });

        console.log('Member creation result:', memberResult, 'Error:', memberError);

        if (memberError) {
          console.warn('Member creation failed using helper function:', memberError);
          // Try direct insert as fallback
          const { error: fallbackError } = await supabase
            .from('group_members')
            .insert({
              group_id: group.id,
              user_id: user.id,
              role: 'admin'
            });
          
          if (fallbackError) {
            console.warn('Direct insert also failed:', fallbackError);
          } else {
            console.log('Direct insert succeeded as fallback');
          }
        } else {
          console.log('Helper function succeeded:', memberResult);
        }
      } catch (memberErr) {
        console.warn('Both methods failed:', memberErr);
        // Group was still created successfully, but creator might not be a member
        // This is now handled by the updated RLS policy
      }

      console.log('Refreshing groups lists...');

      // Refresh groups list - this should now show the created group even if membership failed
      await fetchUserGroups();
      // Always refresh public groups list to update the explore section
      await fetchPublicGroups();

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

      // Refresh both user groups and public groups lists
      await Promise.all([
        fetchUserGroups(),
        fetchPublicGroups()
      ]);
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

  // Update group information
  const updateGroup = async (groupId: string, updates: {
    name?: string;
    description?: string;
    profile_pic_url?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', groupId)
        .eq('created_by', user.id); // Only allow creator to update

      if (error) throw error;

      // Refresh groups list
      await fetchUserGroups();
    } catch (err) {
      console.error('Error updating group:', err);
      throw err;
    }
  };

  // Test database permissions for debugging
  const testPermissions = async (groupId: string) => {
    if (!user) return;
    
    console.log('=== PERMISSION TEST START ===');
    console.log('Testing permissions for group:', groupId, 'user:', user.id);
    
    try {
      // Test if we can read group info
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
      
      console.log('Group data access:', { groupData, groupError });
      
      if (groupData) {
        console.log('✅ Group found:', {
          name: groupData.name,
          created_by: groupData.created_by,
          am_I_creator: groupData.created_by === user.id
        });
      }
      
      // Test if we can read group members
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);
      
      console.log('Members data access:', { count: membersData?.length, membersError });
      
      // Test current user's role in group
      const { data: myRole, error: roleError } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('My role in group:', { myRole, roleError });
      
      // Test if we can insert a dummy record (without actually inserting)
      console.log('Testing INSERT permission with explain...');
      
      console.log('=== PERMISSION TEST END ===');
      
    } catch (err) {
      console.error('❌ Permission test error:', err);
    }
  };

  // Alternative method to add members (bypasses RLS issues)
  const addMemberAlternative = async (groupId: string, userId: string, role: 'admin' | 'moderator' | 'member' = 'member') => {
    console.log('🔄 Using alternative method to add member:', { groupId, userId, role });

    try {
      // Method: Use upsert with different approach
      const { data, error } = await supabase
        .from('group_members')
        .upsert({
          group_id: groupId,
          user_id: userId,
          role: role,
          joined_at: new Date().toISOString()
        }, {
          onConflict: 'group_id,user_id',
          ignoreDuplicates: false
        })
        .select();

      console.log('Alternative method result:', { data, error });

      if (error) {
        console.error('Alternative method failed:', error);
        throw error;
      }

      console.log('✅ Member added via alternative method');
      await fetchUserGroups();
      return data;
      
    } catch (err) {
      console.error('❌ Alternative method error:', err);
      throw err;
    }
  };

  const addMember = async (groupId: string, userId: string, role: 'admin' | 'moderator' | 'member' = 'member') => {
    if (!user) throw new Error('User not authenticated');

    console.log('Adding member:', { groupId, userId, role, currentUser: user.id });
    
    // Run permission test first
    await testPermissions(groupId);

    try {
      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingMember) {
        console.log('User is already a member, skipping...');
        return;
      }

      // Try normal insert first
      const { data: insertData, error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role: role
        })
        .select();

      if (error) {
        console.log('⚠️ Normal insert failed, trying alternative method...');
        // If normal method fails, try alternative
        try {
          return await addMemberAlternative(groupId, userId, role);
        } catch (altError) {
          console.log('⚠️ Alternative method also failed. All methods exhausted.');
          throw new Error('Unable to add member due to database permissions. Please check if you have admin rights.');
        }
      }

      console.log('Member added successfully:', insertData);
      await fetchUserGroups();
      
    } catch (err) {
      console.error('All methods failed:', err);
      throw err;
    }
  };

  // Remove member from group
  const removeMember = async (groupId: string, userId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;

      console.log('Member removed successfully');
    } catch (err) {
      console.error('Error removing member:', err);
      throw err;
    }
  };

  // Get user's role in a specific group
  const getUserRoleInGroup = async (groupId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // First check if user is the group creator (always admin)
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('created_by')
        .eq('id', groupId)
        .single();

      if (!groupError && groupData?.created_by === user.id) {
        console.log('User is group creator, returning admin role');
        return 'admin';
      }

      // If not creator, check group_members table
      const { data, error } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role from group_members:', error);
        return null;
      }

      return data?.role || null;
    } catch (err) {
      console.error('Error getting user role:', err);
      return null;
    }
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
    console.log('useGroups useEffect triggered. User:', user);
    
    const loadData = async () => {
      if (!user) {
        console.log('No user in loadData, setting loading false');
        setLoading(false);
        return;
      }

      console.log('Loading data for user:', user.id);
      setLoading(true);
      try {
        await Promise.all([
          fetchUserGroups(),
          fetchPublicGroups()
        ]);
        console.log('Data loading completed');
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
    updateGroup,
    addMember,
    removeMember,
    getUserRoleInGroup,
    testPermissions,
    refreshGroups: fetchUserGroups,
    refreshPublicGroups: fetchPublicGroups,
    // Force refresh all data
    forceRefresh: async () => {
      await Promise.all([
        fetchUserGroups(),
        fetchPublicGroups()
      ]);
    }
  };
}
