ALTER TABLE public.chat_appearance
  ADD COLUMN IF NOT EXISTS custom_wallpaper_path text;

CREATE POLICY "Users can read their own chat wallpapers"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-wallpapers'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Users can upload their own chat wallpapers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-wallpapers'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Users can replace their own chat wallpapers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-wallpapers'
  AND owner_id = (SELECT auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'chat-wallpapers'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Users can remove their own chat wallpapers"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-wallpapers'
  AND owner_id = (SELECT auth.uid()::text)
);