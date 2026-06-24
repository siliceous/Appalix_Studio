-- Create storage buckets for talking actors
INSERT INTO storage.buckets (id, name, owner, file_size_limit, public)
VALUES
  ('actor-images', 'actor-images', auth.uid(), 10485760, true),
  ('actor-videos', 'actor-videos', auth.uid(), 104857600, true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for actor-images bucket
CREATE POLICY "Users can upload images to their workspace folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'actor-images');

CREATE POLICY "Users can view images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'actor-images');

CREATE POLICY "Users can delete their workspace images"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'actor-images');

-- RLS policies for actor-videos bucket
CREATE POLICY "Users can upload videos to their workspace folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'actor-videos');

CREATE POLICY "Users can view videos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'actor-videos');

CREATE POLICY "Users can delete their workspace videos"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'actor-videos');
