-- ── Tracking Layer ───────────────────────────────────────────────────────────
-- visitors        — visitor identity, created only on first meaningful form interaction
-- tracking_events — immutable behavioral events (page_view, click, scroll, form_start, form_submit)
--
-- GDPR posture (MVP):
--   visitor_id is NOT set on passive page load.
--   It is created server-side on first form_start or form_submit event only.
--   No cookie consent banner required for MVP.
--
-- Retention:
--   TTL = 90 days on tracking_events (enforced by scheduled cleanup job).
--   See cleanup note below.
--   Revisit partitioning strategy at ~1M rows.
--
-- Tenant isolation:
--   Both tables carry workspace_id. All queries MUST filter by workspace_id.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. visitors ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS visitors (
  -- visitor_id is a client-generated UUID string (crypto.randomUUID()),
  -- stored as text. NOT a DB-generated uuid. Created on first form interaction.
  -- Stored in sessionStorage client-side (not localStorage — no cross-session persistence).
  id                      text        PRIMARY KEY,
  workspace_id            uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Identity — populated on form_submit when user provides contact details
  email                   text,
  phone                   text,

  -- Attribution — which page/form first engaged this visitor
  first_touch_entity_type text        CHECK (first_touch_entity_type IN ('brand_page', 'brand_form')),
  first_touch_entity_id   uuid,

  -- Timestamps
  first_seen_at           timestamptz NOT NULL DEFAULT now(),
  last_seen_at            timestamptz NOT NULL DEFAULT now(),
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS visitors_workspace_idx
  ON visitors (workspace_id);

CREATE INDEX IF NOT EXISTS visitors_email_idx
  ON visitors (workspace_id, email)
  WHERE email IS NOT NULL;

-- ── 2. tracking_events ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tracking_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Visitor/session (visitor_id may be null for passive page_view events)
  visitor_id      text        REFERENCES visitors(id) ON DELETE SET NULL,
  session_id      text        NOT NULL,
  -- session = 30 minutes inactivity (enforced client-side; server records as-is)

  -- Event classification
  event_type      text        NOT NULL
                              CHECK (event_type IN (
                                'page_view', 'click', 'scroll', 'form_start', 'form_submit'
                              )),

  -- Entity that was being interacted with
  entity_type     text        NOT NULL
                              CHECK (entity_type IN ('brand_page', 'brand_form')),
  entity_id       uuid        NOT NULL,

  -- Structured metadata — shape is enforced in the API layer (trackingService),
  -- not at DB level. Required shapes per event_type:
  --   page_view:   { url, referrer, utm_source, utm_medium }
  --   click:       { element, label, href }
  --   scroll:      { depth_pct }
  --   form_start:  { form_id }
  --   form_submit: { form_id, field_count }
  metadata        jsonb       NOT NULL DEFAULT '{}',

  created_at      timestamptz NOT NULL DEFAULT now()
);

-- TTL index — primary path for the 90-day cleanup job
CREATE INDEX IF NOT EXISTS tracking_events_created_at_idx
  ON tracking_events (created_at);

-- Visitor lookup — used by high-intent signal computation
CREATE INDEX IF NOT EXISTS tracking_events_visitor_idx
  ON tracking_events (visitor_id)
  WHERE visitor_id IS NOT NULL;

-- Workspace scoped queries (AI signal, automation decisions)
CREATE INDEX IF NOT EXISTS tracking_events_workspace_idx
  ON tracking_events (workspace_id, created_at DESC);

-- Entity lookup — find all events for a specific page or form
CREATE INDEX IF NOT EXISTS tracking_events_entity_idx
  ON tracking_events (entity_type, entity_id, created_at DESC);

-- ── Cleanup job (TTL = 90 days) ───────────────────────────────────────────────
-- Run this on a schedule (pg_cron or external cron). Batch deletes to avoid
-- table lock on large datasets:
--
--   DO $$
--   DECLARE deleted int;
--   BEGIN
--     LOOP
--       DELETE FROM tracking_events
--       WHERE id IN (
--         SELECT id FROM tracking_events
--         WHERE created_at < now() - interval '90 days'
--         LIMIT 1000
--       );
--       GET DIAGNOSTICS deleted = ROW_COUNT;
--       EXIT WHEN deleted = 0;
--       PERFORM pg_sleep(0.1);
--     END LOOP;
--   END $$;
