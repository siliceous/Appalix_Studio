-- Add business contact/invoice details to workspace_branding
-- These are used to auto-populate the "From" section on quotes/invoices.

alter table workspace_branding
  add column if not exists business_address text,
  add column if not exists business_phone   text,
  add column if not exists business_email   text,
  add column if not exists abn_vat          text;
