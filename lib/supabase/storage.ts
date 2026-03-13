/**
 * Storage bucket name for uploaded images.
 * Create this bucket in Supabase Dashboard (Storage → New bucket → "images").
 * For authenticated uploads, add a policy on storage.objects:
 * - INSERT: bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text
 * - SELECT: bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text
 */
export const IMAGES_BUCKET = "images";
