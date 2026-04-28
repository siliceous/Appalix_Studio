-- ─────────────────────────────────────────────────────────────────────────────
-- 00160 · AI analysis usage rates
--
-- Adds ai_analysis to the global billing rate card and the Anthropic provider
-- cost card. One unit = one AI analysis event (email, conversation, or form).
--
-- Customer charge : $0.001 per analysis
-- Provider cost   : $0.0005 per analysis (Haiku ~500 in + 300 out tokens)
-- Margin          : ~50%
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Patch the current global sell-side rate card ──────────────────────────────
UPDATE billing_rate_cards
SET    rates = rates || '{"ai_analysis": {"unit_price": 0.001}}'::jsonb
WHERE  workspace_id IS NULL
AND    effective_from = (
         SELECT MAX(effective_from)
         FROM   billing_rate_cards
         WHERE  workspace_id IS NULL
       );

-- ── Patch the Anthropic provider cost card (create if missing) ────────────────
INSERT INTO provider_cost_rate_cards (provider, effective_from, rates)
VALUES (
  'anthropic',
  now(),
  '{"ai_analysis": {"unit_price": 0.0005}}'::jsonb
)
ON CONFLICT DO NOTHING;

-- If an Anthropic row already exists, patch it
UPDATE provider_cost_rate_cards
SET    rates = rates || '{"ai_analysis": {"unit_price": 0.0005}}'::jsonb
WHERE  provider = 'anthropic'
AND    effective_from = (
         SELECT MAX(effective_from)
         FROM   provider_cost_rate_cards
         WHERE  provider = 'anthropic'
       );
