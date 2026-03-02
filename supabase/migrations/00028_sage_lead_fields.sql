-- Migration: 00028_sage_lead_fields
-- Adds lead capture fields to sage_contacts and ticket fields to sage_tickets.
-- Run in Supabase Dashboard → SQL Editor.

-- ---------------------------------------------------------------
-- sage_contacts: lead capture fields
-- ---------------------------------------------------------------
alter table sage_contacts
  add column if not exists company_name  text,          -- free-text (no company record required)
  add column if not exists website_url   text,          -- e.g. https://acme.com
  add column if not exists business_goal text;          -- what they want to achieve

-- ---------------------------------------------------------------
-- sage_tickets: ticket contact preference + related link
-- ---------------------------------------------------------------
alter table sage_tickets
  add column if not exists contact_method text,         -- 'email' | 'phone'
  add column if not exists related_url    text;         -- optional URL related to the issue
