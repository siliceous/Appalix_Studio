-- Migration: 00029_sage_contact_extended
-- Adds extended lead/contact fields: type, title, address, visibility, last_contacted_at.
-- Run in Supabase Dashboard → SQL Editor after 00028.

alter table sage_contacts
  add column if not exists contact_type      text not null default 'potential_customer',  -- potential_customer | active_customer | other
  add column if not exists title             text,          -- job title
  add column if not exists street            text,
  add column if not exists city              text,
  add column if not exists state             text,
  add column if not exists zip               text,
  add column if not exists country           text,
  add column if not exists visibility        text not null default 'everyone',  -- everyone | team | only_me
  add column if not exists last_contacted_at timestamptz;
