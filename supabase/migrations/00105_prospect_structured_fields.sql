-- ─────────────────────────────────────────────────────────────────────────────
-- 00105_prospect_structured_fields.sql
-- Adds structured location + primary contact fields to prospect_companies
-- so each data point has a stable field_id for filtering and voice integration
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE prospect_companies
  ADD COLUMN IF NOT EXISTS city     text,
  ADD COLUMN IF NOT EXISTS state    text,
  ADD COLUMN IF NOT EXISTS country  text,
  ADD COLUMN IF NOT EXISTS email_1  text,
  ADD COLUMN IF NOT EXISTS phone_1  text;

-- Index for common filter queries
CREATE INDEX IF NOT EXISTS prospect_companies_city_idx    ON prospect_companies(workspace_id, city);
CREATE INDEX IF NOT EXISTS prospect_companies_country_idx ON prospect_companies(workspace_id, country);
CREATE INDEX IF NOT EXISTS prospect_companies_email1_idx  ON prospect_companies(workspace_id, email_1);
