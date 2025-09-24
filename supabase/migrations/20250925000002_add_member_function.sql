-- Create a function to add members that bypasses RLS restrictions
CREATE OR REPLACE FUNCTION add_group_member(
  target_group_id UUID,
  target_user_id UUID,
  member_role VARCHAR DEFAULT 'member'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  is_authorized BOOLEAN := FALSE;
  result JSON;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Check if the current user is authorized to add members
  -- Case 1: User is the group creator
  IF EXISTS (
    SELECT 1 FROM groups 
    WHERE id = target_group_id AND created_by = current_user_id
  ) THEN
    is_authorized := TRUE;
  END IF;
  
  -- Case 2: User is an admin or moderator of the group
  IF NOT is_authorized AND EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = target_group_id 
    AND user_id = current_user_id 
    AND role IN ('admin', 'moderator')
  ) THEN
    is_authorized := TRUE;
  END IF;
  
  -- Return error if not authorized
  IF NOT is_authorized THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized to add members to this group');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = target_group_id AND user_id = target_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'User is already a member of this group');
  END IF;
  
  -- Add the member
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (target_group_id, target_user_id, member_role);
  
  -- Return success
  RETURN json_build_object('success', true, 'message', 'Member added successfully');
  
EXCEPTION WHEN others THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;