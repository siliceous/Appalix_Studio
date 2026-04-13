-- Public storage bucket for bot widget avatar images
insert into storage.buckets (id, name, public)
values ('bot-avatars', 'bot-avatars', true)
on conflict (id) do nothing;

-- Anyone can read (public bucket so the widget JS can load the image);
-- service role (admin client) handles all writes
create policy "public read bot avatars"
  on storage.objects for select
  using (bucket_id = 'bot-avatars');
