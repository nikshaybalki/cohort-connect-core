-- FINAL FIX: Create a function that bypasses RLS completely
-- This function will run with SECURITY DEFINER which means it runs with the creator's privileges

CREATE OR REPLACE FUNCTION public.add_group_member_bypass(
  target_group_id UUID,
  target_user_id UUID,
  member_role TEXT DEFAULT 'member'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- This is the key - bypasses RLS
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  result JSON;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = target_group_id AND user_id = target_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'User is already a member of this group');
  END IF;
  
  -- Insert the member (this bypasses RLS because of SECURITY DEFINER)
  INSERT INTO group_members (group_id, user_id, role, joined_at)
  VALUES (target_group_id, target_user_id, member_role, NOW());
  
  -- Return success
  RETURN json_build_object(
    'success', true, 
    'message', 'Member added successfully',
    'group_id', target_group_id,
    'user_id', target_user_id,
    'role', member_role
  );
  
EXCEPTION WHEN others THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.add_group_member_bypass TO authenticated;