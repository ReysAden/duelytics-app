-- ====================================================================
-- INSERT DEFAULT BACKGROUND
-- Replace the image_url with the actual Supabase Storage URL after upload
-- ====================================================================

INSERT INTO backgrounds (
  name, 
  image_url, 
  image_filename, 
  uploaded_by,
  created_at
) VALUES (
  'Default Background',
  'https://onamlvzviwqkqlaejlra.supabase.co/storage/v1/object/public/backgrounds/Default_Background.jpg',
  'Default_Background.jpg',
  NULL,  -- System default, no specific uploader
  CURRENT_TIMESTAMP
);