-- ─────────────────────────────────────────────────────────────────────────────
-- 00161 · Gemini Live voice session billing rates
--
-- gemini_live_minute covers both:
--   • Sage dashboard voice assistant (/live/ws)
--   • Widget customer-facing voice bot (/chat/voice-ws)
--
-- Customer charge : $0.10 / minute  (billable minutes = ceil(seconds / 60), min 1)
-- Provider cost   : $0.022 / minute (Gemini Live pricing as of 2026)
-- Margin          : ~78%
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Patch the current global sell-side rate card ──────────────────────────────
UPDATE billing_rate_cards
SET    rates = rates || '{"gemini_live_minute": {"unit_price": 0.10, "min_increment_sec": 60}}'::jsonb
WHERE  workspace_id IS NULL
AND    effective_from = (
         SELECT MAX(effective_from)
         FROM   billing_rate_cards
         WHERE  workspace_id IS NULL
       );

-- ── Patch / create the Google provider cost card ──────────────────────────────
INSERT INTO provider_cost_rate_cards (provider, effective_from, rates)
VALUES (
  'google',
  now(),
  '{"gemini_live_minute": {"unit_price": 0.022, "min_increment_sec": 60}}'::jsonb
)
ON CONFLICT DO NOTHING;

UPDATE provider_cost_rate_cards
SET    rates = rates || '{"gemini_live_minute": {"unit_price": 0.022, "min_increment_sec": 60}}'::jsonb
WHERE  provider = 'google'
AND    effective_from = (
         SELECT MAX(effective_from)
         FROM   provider_cost_rate_cards
         WHERE  provider = 'google'
       );
