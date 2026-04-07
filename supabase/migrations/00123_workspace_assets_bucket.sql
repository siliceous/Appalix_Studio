-- Public storage bucket for brand assets (logos, images, favicons)
insert into storage.buckets (id, name, public)
values ('workspace-assets', 'workspace-assets', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to the bucket
create policy "authenticated users can upload brand assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'workspace-assets');

-- Allow authenticated users to update their uploads
create policy "authenticated users can update brand assets"
on storage.objects for update
to authenticated
using (bucket_id = 'workspace-assets');

-- Allow authenticated users to delete their uploads
create policy "authenticated users can delete brand assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'workspace-assets');

-- Public read access (bucket is public)
create policy "public can read brand assets"
on storage.objects for select
using (bucket_id = 'workspace-assets');
