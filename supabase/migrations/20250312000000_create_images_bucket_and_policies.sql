-- Create storage bucket for user photos (Image Store app)
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload only to their own folder: images/{user_id}/...
CREATE POLICY "Users can upload own images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read only their own folder
CREATE POLICY "Users can read own images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text
);
