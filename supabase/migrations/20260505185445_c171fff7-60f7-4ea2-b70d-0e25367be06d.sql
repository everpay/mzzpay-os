-- Configure kyb-documents bucket with proper file limits
UPDATE storage.buckets
SET file_size_limit = 10485760,  -- 10 MB
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png']
WHERE id = 'kyb-documents';