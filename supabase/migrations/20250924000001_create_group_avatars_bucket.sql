-- Create group-avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-avatars', 'group-avatars', true);

-- Allow authenticated users to upload group avatars
CREATE POLICY "Allow authenticated group avatar uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'group-avatars' AND 
  auth.role() = 'authenticated'
);

-- Allow public access to view group avatars
CREATE POLICY "Allow public access to group avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'group-avatars');

-- Allow users to update group avatars (for group admins)
CREATE POLICY "Allow users to update group avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'group-avatars' AND 
  auth.role() = 'authenticated'
);

-- Allow users to delete group avatars (for group admins)
CREATE POLICY "Allow users to delete group avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'group-avatars' AND 
  auth.role() = 'authenticated'
);