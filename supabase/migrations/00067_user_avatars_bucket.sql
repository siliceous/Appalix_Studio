-- Public storage bucket for user profile pictures
insert into storage.buckets (id, name, public)
values ('user-avatars', 'user-avatars', true)
on conflict (id) do nothing;

-- Anyone can read (public bucket); service role (admin client) handles writes
create policy "public read user avatars"
  on storage.objects for select
  using (bucket_id = 'user-avatars');
