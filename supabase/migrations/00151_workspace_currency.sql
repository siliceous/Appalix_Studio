-- ─────────────────────────────────────────────────────────────────────────────
-- 00151_workspace_currency.sql
-- Add country and currency to workspaces so the wallet top-up flow can present
-- the correct currency per workspace instead of hardcoding AUD.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS country  text NOT NULL DEFAULT 'AU',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'AUD';

-- Sync existing wallet_accounts rows to match their workspace currency
UPDATE wallet_accounts wa
SET    currency = w.currency
FROM   workspaces w
WHERE  wa.workspace_id = w.id
  AND  wa.currency <> w.currency;
