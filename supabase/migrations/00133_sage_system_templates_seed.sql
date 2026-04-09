-- ─────────────────────────────────────────────────────────────────────────────
-- 00133_sage_system_templates_seed.sql
--
-- Built-in system templates for Sage automation.
-- workspace_id IS NULL → visible to all workspaces, read-only from the UI.
--
-- Includes:
--   sage_email_templates  — 5 email templates covering the full outreach journey
--   automation_templates  — 2 DAG templates (warm intro + reengagement)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── sage_email_templates (system) ────────────────────────────────────────────

INSERT INTO sage_email_templates (
  id, workspace_id, name, description,
  category, automation_type, channel,
  subject_template, body_template, variables,
  style_metadata_json, is_active, is_system
) VALUES

-- 1. Initial Outreach — Warm Introduction
(
  '10000000-0000-0000-0000-000000000001',
  NULL,
  'Initial Outreach',
  'First-touch email for warm introduction campaigns. Friendly, concise, no pressure.',
  'initial_outreach',
  'warm_introduction',
  'email',
  'Quick intro from {{sender_name}}',
  E'Hi {{first_name}},\n\nI came across {{company_name}} and wanted to reach out — we work with companies like yours to help with {{value_proposition}}.\n\nI''d love to share a few ideas that have worked well for similar businesses. Would a short 15-minute call this week or next make sense?\n\n{{sender_name}}\n{{sender_title}}',
  '["first_name","company_name","value_proposition","sender_name","sender_title"]',
  '{"tone":"friendly","greeting_style":"Hi","signoff_style":"Best","cta_style":"question","paragraph_density":"short","formatting_style":"plain","brand_terms":[]}',
  true,
  true
),

-- 2. Follow-up
(
  '10000000-0000-0000-0000-000000000002',
  NULL,
  'Follow-up',
  'Second touch after no response to the initial email. References prior message.',
  'follow_up',
  NULL,
  'email',
  'Following up, {{first_name}}',
  E'Hi {{first_name}},\n\nI wanted to follow up on my previous email in case it got buried.\n\nI know you''re busy, so I''ll keep this brief — we''ve helped similar companies at {{company_name}}''s stage with {{value_proposition}}, and I think there could be a fit.\n\nWould it be worth a quick chat?\n\n{{sender_name}}',
  '["first_name","company_name","value_proposition","sender_name"]',
  '{"tone":"casual","greeting_style":"Hi","signoff_style":"Best","cta_style":"question","paragraph_density":"short","formatting_style":"plain","brand_terms":[]}',
  true,
  true
),

-- 3. Qualification
(
  '10000000-0000-0000-0000-000000000003',
  NULL,
  'Qualification',
  'Discovery-oriented email to understand the prospect''s situation and priorities.',
  'qualification',
  'qualification',
  'email',
  'Quick question for you, {{first_name}}',
  E'Hi {{first_name}},\n\nI have a simple question — what''s the biggest challenge you''re currently facing with {{challenge_area}}?\n\nI ask because we''ve seen a few common patterns at companies like {{company_name}}, and I''d love to share what''s worked.\n\nEven a one-line reply would be super helpful.\n\n{{sender_name}}',
  '["first_name","company_name","challenge_area","sender_name"]',
  '{"tone":"casual","greeting_style":"Hi","signoff_style":"Best","cta_style":"question","paragraph_density":"short","formatting_style":"plain","brand_terms":[]}',
  true,
  true
),

-- 4. Meeting Request
(
  '10000000-0000-0000-0000-000000000004',
  NULL,
  'Meeting Request',
  'Direct ask for a discovery call. Used after qualification or early engagement.',
  'meeting_request',
  'meeting_conversion',
  'email',
  '15-min call this week, {{first_name}}?',
  E'Hi {{first_name}},\n\nBased on what I know about {{company_name}}, I think we could add real value — specifically around {{value_proposition}}.\n\nWould you be open to a 15-minute call this week? I''ll come prepared with a few specific ideas.\n\nYou can book directly here: {{calendar_link}}\n\nOtherwise, just let me know what works.\n\n{{sender_name}}\n{{sender_title}}',
  '["first_name","company_name","value_proposition","calendar_link","sender_name","sender_title"]',
  '{"tone":"friendly","greeting_style":"Hi","signoff_style":"Best","cta_style":"direct","paragraph_density":"short","formatting_style":"plain","brand_terms":[]}',
  true,
  true
),

-- 5. Reengagement
(
  '10000000-0000-0000-0000-000000000005',
  NULL,
  'Reengagement',
  'Win-back email for contacts who went cold. Light-touch, gives an easy out.',
  'reengagement',
  'reengagement',
  'email',
  'Still relevant, {{first_name}}?',
  E'Hi {{first_name}},\n\nI don''t want to keep reaching out if the timing isn''t right — but I also don''t want to close the door if there''s still interest.\n\nIs {{company_name}} still exploring options in this space, or should I check back in a few months?\n\nEither way, completely fine — just let me know.\n\n{{sender_name}}',
  '["first_name","company_name","sender_name"]',
  '{"tone":"friendly","greeting_style":"Hi","signoff_style":"Best","cta_style":"soft","paragraph_density":"short","formatting_style":"plain","brand_terms":[]}',
  true,
  true
)

ON CONFLICT (id) DO NOTHING;

-- ── automation_templates (system DAGs) ────────────────────────────────────────

INSERT INTO automation_templates (
  id, workspace_id, name, description,
  automation_type, trigger_type, primary_channel,
  steps, entry_step_id,
  is_active, is_system, version
) VALUES

-- 1. Warm Introduction — 3-step email sequence
(
  '20000000-0000-0000-0000-000000000001',
  NULL,
  'Warm Introduction (Email)',
  'Classic 3-touch outreach: initial email → wait 2 days → follow-up → wait 3 days → meeting request.',
  'warm_introduction',
  'manual',
  'email',
  '[
    {
      "id": "step_1",
      "type": "send_email",
      "label": "Initial Outreach",
      "config": {
        "template_category": "initial_outreach",
        "automation_type": "warm_introduction"
      },
      "next_step_id": "step_2",
      "on_fail_step_id": null,
      "delay_hours": 0
    },
    {
      "id": "step_2",
      "type": "wait",
      "label": "Wait 2 days",
      "config": {},
      "next_step_id": "step_3",
      "on_fail_step_id": null,
      "delay_hours": 48
    },
    {
      "id": "step_3",
      "type": "send_email",
      "label": "Follow-up",
      "config": {
        "template_category": "follow_up",
        "automation_type": null
      },
      "next_step_id": "step_4",
      "on_fail_step_id": null,
      "delay_hours": 0
    },
    {
      "id": "step_4",
      "type": "wait",
      "label": "Wait 3 days",
      "config": {},
      "next_step_id": "step_5",
      "on_fail_step_id": null,
      "delay_hours": 72
    },
    {
      "id": "step_5",
      "type": "send_email",
      "label": "Meeting Request",
      "config": {
        "template_category": "meeting_request",
        "automation_type": "meeting_conversion"
      },
      "next_step_id": null,
      "on_fail_step_id": null,
      "delay_hours": 0
    }
  ]',
  'step_1',
  true,
  true,
  1
),

-- 2. Reengagement — 2-touch sequence
(
  '20000000-0000-0000-0000-000000000002',
  NULL,
  'Reengagement (Email)',
  '2-touch reengagement: soft win-back → wait 3 days → final follow-up.',
  'reengagement',
  'manual',
  'email',
  '[
    {
      "id": "step_1",
      "type": "send_email",
      "label": "Reengagement",
      "config": {
        "template_category": "reengagement",
        "automation_type": "reengagement"
      },
      "next_step_id": "step_2",
      "on_fail_step_id": null,
      "delay_hours": 0
    },
    {
      "id": "step_2",
      "type": "wait",
      "label": "Wait 3 days",
      "config": {},
      "next_step_id": "step_3",
      "on_fail_step_id": null,
      "delay_hours": 72
    },
    {
      "id": "step_3",
      "type": "send_email",
      "label": "Final Follow-up",
      "config": {
        "template_category": "follow_up",
        "automation_type": null
      },
      "next_step_id": null,
      "on_fail_step_id": null,
      "delay_hours": 0
    }
  ]',
  'step_1',
  true,
  true,
  1
)

ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
