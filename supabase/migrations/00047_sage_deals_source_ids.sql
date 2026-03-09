-- Add source_email_id and source_form_id to sage_deals for dedup tracking.
-- Without these, the backfill creates duplicate deals on re-runs because the
-- only dedup guard was "contact has an open deal" — not "this specific email
-- already produced a deal".

alter table sage_deals
  add column if not exists source_email_id uuid references sage_emails(id) on delete set null,
  add column if not exists source_form_id  uuid references leads(id)       on delete set null;

create index if not exists idx_sage_deals_source_email_id on sage_deals(source_email_id) where source_email_id is not null;
create index if not exists idx_sage_deals_source_form_id  on sage_deals(source_form_id)  where source_form_id  is not null;
