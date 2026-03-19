-- Per-form Mailchimp audience override
-- When set, form submissions sync to this list instead of the workspace-level list_id
alter table sage_forms
  add column if not exists mailchimp_list_id text;
