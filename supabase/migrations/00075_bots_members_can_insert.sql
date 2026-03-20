-- Allow any workspace member (not just admins) to insert bots.
-- The original policy was too restrictive: invited members could not create bots.

drop policy if exists "bots: admins can insert" on bots;

create policy "bots: members can insert"
  on bots for insert
  with check (workspace_id in (select public.my_workspace_ids()));
