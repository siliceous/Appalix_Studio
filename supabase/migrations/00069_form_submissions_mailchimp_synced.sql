-- Track when a form submission contact was successfully synced to Mailchimp
alter table sage_form_submissions
  add column if not exists mailchimp_synced_at timestamptz;
