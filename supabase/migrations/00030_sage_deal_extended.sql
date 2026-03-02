-- ============================================================
-- Migration 00030: Extend sage_deals with additional fields
-- ============================================================

alter table sage_deals
  add column if not exists close_date      date,
  add column if not exists source          text,
  add column if not exists priority        text check (priority in ('low','medium','high')),
  add column if not exists win_percentage  smallint check (win_percentage between 0 and 100),
  add column if not exists visibility      text not null default 'everyone',
  add column if not exists description     text,
  add column if not exists company_name    text;
