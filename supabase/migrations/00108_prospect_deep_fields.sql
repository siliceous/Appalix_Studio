-- ─────────────────────────────────────────────────────────────────────────────
-- 00108_prospect_deep_fields.sql
-- Adds contact_name + pricing_hint to prospect_companies
-- (populated by deep multi-page crawl + richer LLM extraction)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE prospect_companies
  ADD COLUMN IF NOT EXISTS contact_name  text,
  ADD COLUMN IF NOT EXISTS pricing_hint  text;
