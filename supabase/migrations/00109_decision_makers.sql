-- ─────────────────────────────────────────────────────────────────────────────
-- 00109_decision_makers.sql
-- Adds decision_makers JSONB column to prospect_companies.
-- Each element conforms to DetectedPerson: { full_name, title, company,
-- context_block, source_url, source_snippet, confidence_score }
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE prospect_companies
  ADD COLUMN IF NOT EXISTS decision_makers jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS prospect_companies_decision_makers_idx
  ON prospect_companies USING gin (decision_makers);
