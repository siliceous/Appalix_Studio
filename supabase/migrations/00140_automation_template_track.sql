-- ─────────────────────────────────────────────────────────────────────────────
-- 00140_automation_template_track.sql
--
-- Adds a `track` column to automation_templates for grouping templates into
-- named collections (e.g. "Lead Nurturing").
-- Seeds the missing "Warm Intro" 8-step template and tags all existing
-- system templates as track = 'Lead Nurturing'.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE automation_templates
  ADD COLUMN IF NOT EXISTS track text DEFAULT NULL;

COMMENT ON COLUMN automation_templates.track IS
  'Named track that groups related templates, e.g. "Lead Nurturing". NULL for ungrouped templates.';

-- ── New system template: Warm Intro (8 linear steps) ─────────────────────────

INSERT INTO automation_templates (
  workspace_id, name, description,
  automation_type, trigger_type, primary_channel,
  is_system, is_active, track, entry_step_id, steps
) VALUES (
  NULL,
  'Warm Intro',
  'Comprehensive 8-step warm introduction: four spaced emails building rapport and ending with a direct meeting ask and handoff.',
  'warm_introduction', 'manual', 'email',
  true, true,
  'Lead Nurturing',
  'wi8_step1',
  '[
    {
      "id":           "wi8_step1",
      "type":         "send_email",
      "label":        "Initial Outreach",
      "delay_hours":  0,
      "next_step_id": "wi8_step2",
      "config": {
        "subject_template": "Quick intro from {{sender_first_name}} at {{company_name}}",
        "tone":             "warm, concise, value-first",
        "goal_hint":        "Introduce Appalix and invite a short call — no hard sell"
      }
    },
    {
      "id":           "wi8_step2",
      "type":         "wait",
      "label":        "Wait 2 Days",
      "delay_hours":  48,
      "next_step_id": "wi8_step3",
      "config": {}
    },
    {
      "id":           "wi8_step3",
      "type":         "send_email",
      "label":        "Follow-up",
      "delay_hours":  0,
      "next_step_id": "wi8_step4",
      "config": {
        "subject_template": "Re: Quick intro — {{contact_first_name}}, just checking in",
        "tone":             "casual, very short, different angle",
        "goal_hint":        "Short bump on the first email — try a different hook"
      }
    },
    {
      "id":           "wi8_step4",
      "type":         "wait",
      "label":        "Wait 2 Days",
      "delay_hours":  48,
      "next_step_id": "wi8_step5",
      "config": {}
    },
    {
      "id":           "wi8_step5",
      "type":         "send_email",
      "label":        "Value Drop",
      "delay_hours":  0,
      "next_step_id": "wi8_step6",
      "config": {
        "subject_template": "{{contact_first_name}}, thought you''d find this useful",
        "tone":             "generous, educational, no-ask",
        "goal_hint":        "Share a relevant insight, tip, or case study — zero pitch"
      }
    },
    {
      "id":           "wi8_step6",
      "type":         "wait",
      "label":        "Wait 3 Days",
      "delay_hours":  72,
      "next_step_id": "wi8_step7",
      "config": {}
    },
    {
      "id":           "wi8_step7",
      "type":         "send_email",
      "label":        "Meeting Request",
      "delay_hours":  0,
      "next_step_id": "wi8_step8",
      "config": {
        "subject_template": "{{contact_first_name}}, worth a 15-min chat?",
        "tone":             "direct, warm, easy yes",
        "goal_hint":        "Ask for a specific short meeting — share a Calendly link"
      }
    },
    {
      "id":           "wi8_step8",
      "type":         "handoff",
      "label":        "Handoff to Sales",
      "delay_hours":  0,
      "next_step_id": null,
      "config": {
        "reason": "Warm intro sequence complete — review replies and take over"
      }
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- ── Tag all existing system templates as Lead Nurturing ───────────────────────

UPDATE automation_templates
SET    track = 'Lead Nurturing'
WHERE  is_system    = true
  AND  workspace_id IS NULL
  AND  track        IS NULL;

NOTIFY pgrst, 'reload schema';
