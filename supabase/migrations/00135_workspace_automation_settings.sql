-- ─────────────────────────────────────────────────────────────────────────────
-- 00135_workspace_automation_settings.sql
--
-- Workspace-level configuration for Sage automation email variables.
--
-- These values fill the shared template variables that are the same across
-- all contacts for a given workspace:
--
--   value_proposition → {{value_proposition}}
--     e.g. "scale your outbound pipeline without growing your SDR team"
--
--   workspace_tagline → {{workspace_tagline}}  (optional, rarely used)
--
--   fallback_calendar_link → {{calendar_link}} when the sender has no personal link
--
--   fallback_sender_title  → {{sender_title}}  when the sender has no job_title
--
--   challenge_area        → {{challenge_area}} for qualification templates
--     e.g. "outbound sales velocity" or "customer onboarding"
--
-- Design decisions:
--   - One row per workspace (upsert pattern).
--   - All fields nullable; missing values fall back to empty string in the
--     scheduler rather than blocking the send.
--   - RLS enabled; workspace members can read, admins can write.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workspace_automation_settings (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id            uuid        NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,

  -- ── Shared template variables ─────────────────────────────────────────────
  value_proposition       text,
  -- One-line statement of value: "we help X companies do Y"
  -- Used in: {{value_proposition}}

  workspace_tagline       text,
  -- Short tagline, rarely needed but useful for formal templates
  -- Used in: {{workspace_tagline}}

  challenge_area          text,
  -- Default challenge area for qualification templates
  -- e.g. "outbound sales velocity", "customer retention"
  -- Used in: {{challenge_area}}

  -- ── Fallback sender fields ────────────────────────────────────────────────
  -- Used when the sending user's user_profiles row lacks these values
  fallback_sender_title   text,
  -- e.g. "Head of Growth" or "Account Executive"

  fallback_calendar_link  text,
  -- Workspace-wide booking page fallback

  -- ── Audit ─────────────────────────────────────────────────────────────────
  updated_by              uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_workspace_automation_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workspace_automation_settings_updated_at ON workspace_automation_settings;
CREATE TRIGGER workspace_automation_settings_updated_at
  BEFORE UPDATE ON workspace_automation_settings
  FOR EACH ROW EXECUTE FUNCTION touch_workspace_automation_settings_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE workspace_automation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_automation_settings_select" ON workspace_automation_settings;
DROP POLICY IF EXISTS "workspace_automation_settings_insert" ON workspace_automation_settings;
DROP POLICY IF EXISTS "workspace_automation_settings_update" ON workspace_automation_settings;

CREATE POLICY "workspace_automation_settings_select"
  ON workspace_automation_settings FOR SELECT
  USING (workspace_id IN (SELECT public.my_workspace_ids()));

CREATE POLICY "workspace_automation_settings_insert"
  ON workspace_automation_settings FOR INSERT
  WITH CHECK (workspace_id IN (SELECT public.my_workspace_ids()));

CREATE POLICY "workspace_automation_settings_update"
  ON workspace_automation_settings FOR UPDATE
  USING (workspace_id IN (SELECT public.my_workspace_ids()));

NOTIFY pgrst, 'reload schema';
