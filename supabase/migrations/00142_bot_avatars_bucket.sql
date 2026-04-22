-- Public storage bucket for bot widget avatar images
insert into storage.buckets (id, name, public)
values ('bot-avatars', 'bot-avatars', true)
on conflict (id) do nothing;

-- Anyone can read (public bucket so the widget JS can load the image);
-- service role (admin client) handles all writes
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'public read bot avatars'
  ) then
    create policy "public read bot avatars"
      on storage.objects for select
      using (bucket_id = 'bot-avatars');
  end if;
end $$;
