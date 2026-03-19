-- Allow platform imports (Mailchimp, ActiveCampaign, etc.) as form submissions
-- form_id becomes nullable — null means it came from a platform sync, not a form

alter table sage_form_submissions
  alter column form_id drop not null;

-- Add source_platform so the UI knows where each submission came from
alter table sage_form_submissions
  add column if not exists source_platform text;
  -- null  = regular form submission
  -- 'mailchimp' | 'activecampaign' = platform import

-- Replace the form-scoped index with a workspace+date index that works with null form_id
drop index if exists sage_form_submissions_form_idx;
create index if not exists sage_form_submissions_workspace_date_idx
  on sage_form_submissions(workspace_id, created_at desc);
