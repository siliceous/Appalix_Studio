-- ─────────────────────────────────────────────────────────────────────────────
-- 00110_prospect_credits.sql
-- Lead credit system for AI prospecting.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add monthly prospect credit columns to workspaces
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS prospect_credits_monthly     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prospect_credits_monthly_cap integer NOT NULL DEFAULT 0;

-- 2. Backfill existing workspaces by current plan
UPDATE workspaces SET
  prospect_credits_monthly_cap = CASE plan
    WHEN 'individual' THEN 25
    WHEN 'pro'        THEN 100
    WHEN 'edge'       THEN 250
    WHEN 'team'       THEN 500
    WHEN 'enterprise' THEN 500
    ELSE 25
  END,
  prospect_credits_monthly = CASE plan
    WHEN 'individual' THEN 25
    WHEN 'pro'        THEN 100
    WHEN 'edge'       THEN 250
    WHEN 'team'       THEN 500
    WHEN 'enterprise' THEN 500
    ELSE 25
  END;

-- 3. Add-on credit ledger (one row per purchase, never deleted)
CREATE TABLE IF NOT EXISTS workspace_prospect_credit_packs (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_session_id  text        UNIQUE,
  pack_name          text        NOT NULL CHECK (pack_name IN ('starter','growth','agency')),
  credits_total      integer     NOT NULL,
  credits_remaining  integer     NOT NULL,
  purchased_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credit_packs_workspace_idx
  ON workspace_prospect_credit_packs(workspace_id)
  WHERE credits_remaining > 0;

-- 4. Transaction audit log
CREATE TABLE IF NOT EXISTS prospect_credit_transactions (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id           uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  prospect_id            uuid        REFERENCES prospect_companies(id) ON DELETE SET NULL,
  job_id                 uuid        REFERENCES prospect_crawl_jobs(id) ON DELETE SET NULL,
  pack_id                uuid        REFERENCES workspace_prospect_credit_packs(id) ON DELETE SET NULL,
  kind                   text        NOT NULL CHECK (kind IN ('monthly_deduct','addon_deduct','monthly_reset','addon_purchase')),
  delta                  integer     NOT NULL,
  balance_after_monthly  integer     NOT NULL,
  balance_after_addon    integer     NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credit_tx_workspace_idx
  ON prospect_credit_transactions(workspace_id, created_at DESC);

-- 5. Atomic deduct function — deducts monthly first, then add-on packs (FIFO)
CREATE OR REPLACE FUNCTION deduct_prospect_credit(
  p_workspace_id uuid,
  p_prospect_id  uuid,
  p_job_id       uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monthly  integer;
  v_pack     RECORD;
  v_new_monthly integer;
  v_new_addon   integer;
BEGIN
  -- Try monthly first
  UPDATE workspaces
     SET prospect_credits_monthly = prospect_credits_monthly - 1
   WHERE id = p_workspace_id
     AND prospect_credits_monthly > 0
  RETURNING prospect_credits_monthly INTO v_monthly;

  IF FOUND THEN
    SELECT COALESCE(SUM(credits_remaining), 0) INTO v_new_addon
      FROM workspace_prospect_credit_packs
     WHERE workspace_id = p_workspace_id AND credits_remaining > 0;

    INSERT INTO prospect_credit_transactions
      (workspace_id, prospect_id, job_id, kind, delta, balance_after_monthly, balance_after_addon)
    VALUES
      (p_workspace_id, p_prospect_id, p_job_id, 'monthly_deduct', -1, v_monthly, v_new_addon);
    RETURN true;
  END IF;

  -- Monthly exhausted — try oldest add-on pack
  FOR v_pack IN
    SELECT id, credits_remaining
      FROM workspace_prospect_credit_packs
     WHERE workspace_id = p_workspace_id AND credits_remaining > 0
     ORDER BY purchased_at ASC
       FOR UPDATE SKIP LOCKED
     LIMIT 1
  LOOP
    UPDATE workspace_prospect_credit_packs
       SET credits_remaining = credits_remaining - 1
     WHERE id = v_pack.id;

    SELECT prospect_credits_monthly INTO v_new_monthly
      FROM workspaces WHERE id = p_workspace_id;

    SELECT COALESCE(SUM(credits_remaining), 0) INTO v_new_addon
      FROM workspace_prospect_credit_packs
     WHERE workspace_id = p_workspace_id AND credits_remaining > 0;

    INSERT INTO prospect_credit_transactions
      (workspace_id, prospect_id, job_id, pack_id, kind, delta, balance_after_monthly, balance_after_addon)
    VALUES
      (p_workspace_id, p_prospect_id, p_job_id, v_pack.id, 'addon_deduct', -1, v_new_monthly, v_new_addon);
    RETURN true;
  END LOOP;

  RETURN false;
END;
$$;

-- 6. Monthly reset function (called from Stripe webhook on renewal)
CREATE OR REPLACE FUNCTION reset_prospect_credits_monthly(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap   integer;
  v_addon integer;
BEGIN
  UPDATE workspaces
     SET prospect_credits_monthly = prospect_credits_monthly_cap
   WHERE id = p_workspace_id
  RETURNING prospect_credits_monthly_cap INTO v_cap;

  SELECT COALESCE(SUM(credits_remaining), 0) INTO v_addon
    FROM workspace_prospect_credit_packs
   WHERE workspace_id = p_workspace_id AND credits_remaining > 0;

  INSERT INTO prospect_credit_transactions
    (workspace_id, kind, delta, balance_after_monthly, balance_after_addon)
  VALUES
    (p_workspace_id, 'monthly_reset', v_cap, v_cap, v_addon);
END;
$$;

GRANT ALL ON workspace_prospect_credit_packs  TO service_role;
GRANT ALL ON prospect_credit_transactions      TO service_role;
GRANT EXECUTE ON FUNCTION deduct_prospect_credit          TO service_role;
GRANT EXECUTE ON FUNCTION reset_prospect_credits_monthly  TO service_role;

NOTIFY pgrst, 'reload schema';
