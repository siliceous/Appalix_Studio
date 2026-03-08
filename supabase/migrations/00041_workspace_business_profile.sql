-- ============================================================
-- Migration 00041: Add sage_business_description to workspaces
-- Used by the email AI analysis to understand what the business
-- sells so it can correctly judge email relevance and priority.
-- ============================================================

alter table workspaces
  add column if not exists sage_business_description text;

comment on column workspaces.sage_business_description is
  'Short description of the business products/services. Injected into email AI analysis so Claude can judge relevance accurately.';
