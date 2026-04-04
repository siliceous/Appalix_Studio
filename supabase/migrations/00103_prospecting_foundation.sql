-- ─────────────────────────────────────────────────────────────────────────────
-- 00103_prospecting_foundation.sql
-- Phase 1 MVP: ICP-driven prospect discovery
--
-- 1. workspace_icp_profiles  — user-defined Ideal Customer Profiles
-- 2. prospect_companies      — discovered companies (dedup by domain)
-- 3. prospect_crawl_jobs     — async job tracking
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. workspace_icp_profiles ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workspace_icp_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  name                text NOT NULL,
  industry            text NOT NULL,
  target_keywords     jsonb NOT NULL DEFAULT '[]',
  locations           jsonb NOT NULL DEFAULT '[]',
  exclude_keywords    jsonb NOT NULL DEFAULT '[]',
  services_of_interest jsonb NOT NULL DEFAULT '[]',

  is_active           boolean NOT NULL DEFAULT true,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_icp_profiles_workspace_idx
  ON workspace_icp_profiles(workspace_id, created_at DESC);

-- ── 2. prospect_companies ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prospect_companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  icp_id          uuid REFERENCES workspace_icp_profiles(id) ON DELETE SET NULL,
  job_id          uuid,  -- FK to prospect_crawl_jobs added below

  -- Identity (domain is the canonical key)
  domain          text NOT NULL,

  -- From search
  title           text,
  snippet         text,
  source          text NOT NULL DEFAULT 'brave',

  -- From extraction (populated after crawl)
  company_name    text,
  description     text,
  services        jsonb NOT NULL DEFAULT '[]',
  location_text   text,
  emails          jsonb NOT NULL DEFAULT '[]',
  phones          jsonb NOT NULL DEFAULT '[]',

  -- Scoring
  score           integer,
  score_tier      text CHECK (score_tier IN ('hot', 'warm', 'cold', 'discarded')),
  score_breakdown jsonb,

  -- Pipeline links
  deal_id         uuid REFERENCES sage_deals(id) ON DELETE SET NULL,
  contact_id      uuid REFERENCES sage_contacts(id) ON DELETE SET NULL,

  -- Lifecycle state
  status          text NOT NULL DEFAULT 'found'
    CHECK (status IN ('found', 'filtered_out', 'crawled', 'scored', 'pushed', 'ignored')),

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE(workspace_id, domain)
);

CREATE INDEX IF NOT EXISTS prospect_companies_workspace_idx
  ON prospect_companies(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS prospect_companies_job_idx
  ON prospect_companies(job_id, score DESC NULLS LAST)
  WHERE job_id IS NOT NULL;

-- ── 3. prospect_crawl_jobs ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prospect_crawl_jobs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  icp_id       uuid REFERENCES workspace_icp_profiles(id) ON DELETE SET NULL,

  search_query text NOT NULL,
  location     text,

  status       text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'searching', 'filtering', 'crawling', 'scoring', 'done', 'failed')),

  -- Running counters updated in-flight
  stats        jsonb NOT NULL DEFAULT '{
    "found": 0,
    "relevant": 0,
    "crawled": 0,
    "scored": 0,
    "pushed": 0
  }'::jsonb,

  error        text,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prospect_crawl_jobs_workspace_idx
  ON prospect_crawl_jobs(workspace_id, created_at DESC);

-- Add FK from prospect_companies to crawl jobs
ALTER TABLE prospect_companies
  ADD CONSTRAINT prospect_companies_job_fk
    FOREIGN KEY (job_id) REFERENCES prospect_crawl_jobs(id) ON DELETE SET NULL;

-- ── Grants ────────────────────────────────────────────────────────────────────

GRANT ALL ON workspace_icp_profiles TO service_role;
GRANT ALL ON prospect_companies TO service_role;
GRANT ALL ON prospect_crawl_jobs TO service_role;

NOTIFY pgrst, 'reload schema';
