-- Expand source_platform check constraint to include email marketing platforms
alter table leads
  drop constraint if exists leads_source_platform_check;

alter table leads
  add constraint leads_source_platform_check
  check (source_platform in ('meta', 'google_ads', 'mailchimp', 'activecampaign'));
