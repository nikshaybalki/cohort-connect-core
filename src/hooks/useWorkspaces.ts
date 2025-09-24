import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Workspace {
  id: string;
  group_id: string;
  name: string;
  description: string;
  workflow_steps: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  group?: {
    name: string;
    profile_pic_url: string | null;
  };
  avatar?: string; // Computed from name
  progress?: number; // Computed from tasks
}

export interface WorkspaceTask {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  assigned_to: string | null;
  assigned_by: string;
  workflow_step: string | null;
  status: 'todo' | 'in_progress' | 'completed';
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee?: {
    id: string;
    username: string;
    full_name: string;
    profile_pic_url: string | null;
  };
  assigner?: {
    id: string;
    username: string;
    full_name: string;
    profile_pic_url: string | null;
  };
}

export function useWorkspaces() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's workspaces
  const fetchWorkspaces = async () => {
    if (!user) {
      console.log('No user found, setting empty workspaces');
      setWorkspaces([]);
      return;
    }

    console.log('Fetching workspaces for user:', user.id);

    try {
      setError(null);
      
      // Get workspaces where user is a group member
      const { data: workspacesData, error: workspacesError } = await supabase
        .from('workspaces')
        .select(`
          *,
          groups!inner(
            name,
            profile_pic_url,
            group_members!inner(user_id)
          )
        `)
        .eq('groups.group_members.user_id', user.id)
        .order('updated_at', { ascending: false });

      console.log('Workspaces data:', workspacesData, 'Error:', workspacesError);

      if (workspacesError) {
        console.error('Error fetching workspaces:', workspacesError);
        setError(workspacesError.message);
        setWorkspaces([]);
        return;
      }

      const processedWorkspaces = (workspacesData || []).map((workspace: any) => ({
        ...workspace,
        workflow_steps: workspace.workflow_steps || [],
        group: {
          name: workspace.groups.name,
          profile_pic_url: workspace.groups.profile_pic_url
        },
        avatar: workspace.name.split(' ').map((word: string) => word[0]).join('').toUpperCase(),
        progress: 0 // Will be calculated with tasks
      }));

      console.log('Final processed workspaces:', processedWorkspaces);
      setWorkspaces(processedWorkspaces);

    } catch (err) {
      console.error('Error in fetchWorkspaces:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch workspaces');
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  };

  // Create a new workspace
  const createWorkspace = async (workspaceData: {
    name: string;
    description: string;
    group_id: string;
    workflow_steps: string[];
  }) => {
    if (!user) throw new Error('User not authenticated');

    console.log('Creating workspace:', workspaceData, 'for user:', user.id);

    try {
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: workspaceData.name,
          description: workspaceData.description,
          group_id: workspaceData.group_id,
          workflow_steps: workspaceData.workflow_steps,
          created_by: user.id
        })
        .select(`
          *,
          groups(name, profile_pic_url)
        `)
        .single();

      console.log('Workspace creation result:', workspace, 'Error:', workspaceError);

      if (workspaceError) {
        console.error('Workspace creation error:', workspaceError);
        throw workspaceError;
      }

      // Refresh workspaces list
      await fetchWorkspaces();

      return workspace;
    } catch (err) {
      console.error('Error creating workspace:', err);
      throw err;
    }
  };

  // Update workspace information
  const updateWorkspace = async (workspaceId: string, updates: {
    name?: string;
    description?: string;
    workflow_steps?: string[];
  }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', workspaceId)
        .eq('created_by', user.id); // Only allow creator to update

      if (error) throw error;

      // Refresh workspaces list
      await fetchWorkspaces();
    } catch (err) {
      console.error('Error updating workspace:', err);
      throw err;
    }
  };

  // Get workspace tasks
  const getWorkspaceTasks = async (workspaceId: string): Promise<WorkspaceTask[]> => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:assigned_to(id, username, full_name, profile_pic_url),
          assigner:assigned_by(id, username, full_name, profile_pic_url)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((task: any) => ({
        ...task,
        assignee: task.assignee,
        assigner: task.assigner
      }));
    } catch (err) {
      console.error('Error fetching workspace tasks:', err);
      throw err;
    }
  };

  // Create a new task
  const createTask = async (taskData: {
    workspace_id: string;
    name: string;
    description?: string;
    assigned_to?: string;
    workflow_step?: string;
    due_date?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          assigned_by: user.id,
          status: 'todo'
        })
        .select(`
          *,
          assignee:assigned_to(id, username, full_name, profile_pic_url),
          assigner:assigned_by(id, username, full_name, profile_pic_url)
        `)
        .single();

      if (error) throw error;

      return data;
    } catch (err) {
      console.error('Error creating task:', err);
      throw err;
    }
  };

  // Update task
  const updateTask = async (taskId: string, updates: {
    name?: string;
    description?: string;
    assigned_to?: string;
    workflow_step?: string;
    status?: 'todo' | 'in_progress' | 'completed';
    due_date?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const updateData: any = { ...updates };
      
      // Set completed_at when marking as completed
      if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (updates.status === 'todo' || updates.status === 'in_progress') {
        updateData.completed_at = null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select(`
          *,
          assignee:assigned_to(id, username, full_name, profile_pic_url),
          assigner:assigned_by(id, username, full_name, profile_pic_url)
        `)
        .single();

      if (error) throw error;

      return data;
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  };

  // Initial data fetch
  useEffect(() => {
    console.log('useWorkspaces useEffect triggered. User:', user);
    
    const loadData = async () => {
      if (!user) {
        console.log('No user in loadData, setting loading false');
        setLoading(false);
        return;
      }

      console.log('Loading workspaces for user:', user.id);
      setLoading(true);
      try {
        await fetchWorkspaces();
        console.log('Workspaces loading completed');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  return {
    workspaces,
    loading,
    error,
    createWorkspace,
    updateWorkspace,
    getWorkspaceTasks,
    createTask,
    updateTask,
    refreshWorkspaces: fetchWorkspaces
  };
}