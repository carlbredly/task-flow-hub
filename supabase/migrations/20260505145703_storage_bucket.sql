-- Storage bucket for task file attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('task-attachments', 'task-attachments', true, 10485760, ARRAY['image/*','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','application/zip'])
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "public_read" ON storage.objects;
DROP POLICY IF EXISTS "owner_delete" ON storage.objects;

CREATE POLICY "authenticated_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "public_read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'task-attachments');

CREATE POLICY "owner_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'task-attachments' AND owner = auth.uid());
