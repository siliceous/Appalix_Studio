-- ─────────────────────────────────────────────────────────────────────────────
-- 00138_automation_system_templates.sql
--
-- Seeds 5 built-in (system) automation templates, one per goal type.
-- workspace_id = NULL → visible to all workspaces.
-- is_system = true   → cannot be deleted by workspaces.
-- All templates use {{double_brace}} variable syntax resolved at send-time.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Warm Introduction (email, 5 steps) ────────────────────────────────────
-- Goal: warm_introduction | Channel: email
-- Flow: intro email → wait 3d → condition(opened?) → [yes] meeting invite → handoff
--                                                  → [no]  follow-up email → wait 2d → handoff

INSERT INTO automation_templates (
  workspace_id, name, description,
  automation_type, trigger_type, primary_channel,
  is_system, is_active, entry_step_id, steps
)
VALUES (
  NULL,
  'Warm Introduction',
  'AI-managed cold outreach sequence: intro email, engagement check, meeting conversion or follow-up path.',
  'warm_introduction', 'manual', 'email',
  true, true,
  'wi_step1',
  '[
    {
      "id":           "wi_step1",
      "type":         "send_email",
      "label":        "Initial Outreach",
      "delay_hours":  0,
      "next_step_id": "wi_step2",
      "config": {
        "subject_template": "Quick intro from {{sender_first_name}} at {{company_name}}",
        "tone":             "warm, concise, value-first",
        "goal_hint":        "Introduce Appalix and invite a short call"
      }
    },
    {
      "id":           "wi_step2",
      "type":         "wait",
      "label":        "Wait 3 Days",
      "delay_hours":  72,
      "next_step_id": "wi_step3",
      "config": {}
    },
    {
      "id":             "wi_step3",
      "type":           "condition",
      "label":          "Did They Open?",
      "delay_hours":    0,
      "branch_yes_id":  "wi_step4_yes",
      "branch_no_id":   "wi_step4_no",
      "next_step_id":   null,
      "config": {
        "condition_label": "Email opened in last 72h",
        "check":           "email_opened"
      }
    },
    {
      "id":           "wi_step4_yes",
      "type":         "send_email",
      "label":        "Meeting Invite",
      "delay_hours":  0,
      "next_step_id": "wi_step5",
      "config": {
        "subject_template": "{{contact_first_name}}, want to find 15 min?",
        "tone":             "direct, friendly, easy yes",
        "goal_hint":        "Suggest a specific time slot or Calendly link"
      }
    },
    {
      "id":           "wi_step4_no",
      "type":         "send_email",
      "label":        "Follow-up Nudge",
      "delay_hours":  0,
      "next_step_id": "wi_step5",
      "config": {
        "subject_template": "Re: Quick intro from {{sender_first_name}}",
        "tone":             "low-pressure, short, different angle",
        "goal_hint":        "Try a different value angle or social proof"
      }
    },
    {
      "id":           "wi_step5",
      "type":         "handoff",
      "label":        "Handoff to Sales",
      "delay_hours":  0,
      "next_step_id": null,
      "config": {
        "reason": "Sequence complete — review reply and take over"
      }
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;


-- ── 2. Qualification (email, 4 steps) ────────────────────────────────────────
-- Goal: qualification | Channel: email
-- Flow: discovery email → wait 2d → deeper question email → wait 2d → handoff

INSERT INTO automation_templates (
  workspace_id, name, description,
  automation_type, trigger_type, primary_channel,
  is_system, is_active, entry_step_id, steps
)
VALUES (
  NULL,
  'Qualification Sequence',
  'AI-managed qualification: two-touch email sequence to understand fit and intent before creating a deal.',
  'qualification', 'manual', 'email',
  true, true,
  'ql_step1',
  '[
    {
      "id":           "ql_step1",
      "type":         "send_email",
      "label":        "Discovery Email",
      "delay_hours":  0,
      "next_step_id": "ql_step2",
      "config": {
        "subject_template": "{{contact_first_name}} — quick question about {{company_name}}",
        "tone":             "curious, consultative",
        "goal_hint":        "Ask one qualifying question about their current process/pain"
      }
    },
    {
      "id":           "ql_step2",
      "type":         "wait",
      "label":        "Wait 2 Days",
      "delay_hours":  48,
      "next_step_id": "ql_step3",
      "config": {}
    },
    {
      "id":           "ql_step3",
      "type":         "send_email",
      "label":        "Deeper Question",
      "delay_hours":  0,
      "next_step_id": "ql_step4",
      "config": {
        "subject_template": "Re: {{contact_first_name}} — one more thing",
        "tone":             "warm, brief",
        "goal_hint":        "Follow up on the first question or ask about budget/timeline"
      }
    },
    {
      "id":           "ql_step4",
      "type":         "handoff",
      "label":        "Sales Review",
      "delay_hours":  0,
      "next_step_id": null,
      "config": {
        "reason": "Qualification sequence complete — create deal if fit confirmed"
      }
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;


-- ── 3. Re-engagement (SMS-first, 5 steps) ────────────────────────────────────
-- Goal: reengagement | Channel: sms
-- Flow: SMS ping → wait 1d → email follow-up → wait 2d → final email → handoff

INSERT INTO automation_templates (
  workspace_id, name, description,
  automation_type, trigger_type, primary_channel,
  is_system, is_active, entry_step_id, steps
)
VALUES (
  NULL,
  'Re-engagement Sequence',
  'AI-managed re-activation: SMS first to cut through inbox noise, then email, then handoff.',
  'reengagement', 'manual', 'sms',
  true, true,
  're_step1',
  '[
    {
      "id":           "re_step1",
      "type":         "send_sms",
      "label":        "Re-engagement SMS",
      "delay_hours":  0,
      "next_step_id": "re_step2",
      "config": {
        "body_template": "Hey {{contact_first_name}}, it''s {{sender_first_name}} from {{company_name}}. Wanted to reconnect — got 5 min this week?",
        "tone":          "casual, brief, human"
      }
    },
    {
      "id":           "re_step2",
      "type":         "wait",
      "label":        "Wait 1 Day",
      "delay_hours":  24,
      "next_step_id": "re_step3",
      "config": {}
    },
    {
      "id":           "re_step3",
      "type":         "send_email",
      "label":        "Follow-up Email",
      "delay_hours":  0,
      "next_step_id": "re_step4",
      "config": {
        "subject_template": "{{contact_first_name}} — picking up where we left off",
        "tone":             "warm, personal, low-pressure",
        "goal_hint":        "Reference previous context if available, offer new value"
      }
    },
    {
      "id":           "re_step4",
      "type":         "wait",
      "label":        "Wait 2 Days",
      "delay_hours":  48,
      "next_step_id": "re_step5",
      "config": {}
    },
    {
      "id":           "re_step5",
      "type":         "send_email",
      "label":        "Final Attempt",
      "delay_hours":  0,
      "next_step_id": "re_step6",
      "config": {
        "subject_template": "Last note from {{sender_first_name}}",
        "tone":             "honest, closing the loop",
        "goal_hint":        "Give them an easy out but leave the door open"
      }
    },
    {
      "id":           "re_step6",
      "type":         "handoff",
      "label":        "Mark as Cold",
      "delay_hours":  0,
      "next_step_id": null,
      "config": {
        "reason": "Re-engagement sequence exhausted — mark contact as cold or pause outreach"
      }
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;


-- ── 4. Meeting Conversion (email, 6 steps) ────────────────────────────────────
-- Goal: meeting_conversion | Channel: email
-- Flow: invite → wait 1d → reminder → wait 1d → condition(booked?) → [yes] confirmation → handoff
--                                                                   → [no]  no-show follow-up → handoff

INSERT INTO automation_templates (
  workspace_id, name, description,
  automation_type, trigger_type, primary_channel,
  is_system, is_active, entry_step_id, steps
)
VALUES (
  NULL,
  'Meeting Conversion',
  'AI-managed appointment sequence: send calendar invite, remind, handle no-show or confirm booked meeting.',
  'meeting_conversion', 'manual', 'email',
  true, true,
  'mc_step1',
  '[
    {
      "id":           "mc_step1",
      "type":         "send_email",
      "label":        "Calendar Invite",
      "delay_hours":  0,
      "next_step_id": "mc_step2",
      "config": {
        "subject_template": "{{contact_first_name}}, here''s a time to connect",
        "tone":             "clear, action-oriented",
        "goal_hint":        "Share a scheduling link with 2–3 specific time options"
      }
    },
    {
      "id":           "mc_step2",
      "type":         "wait",
      "label":        "Wait 1 Day",
      "delay_hours":  24,
      "next_step_id": "mc_step3",
      "config": {}
    },
    {
      "id":           "mc_step3",
      "type":         "send_email",
      "label":        "Gentle Reminder",
      "delay_hours":  0,
      "next_step_id": "mc_step4",
      "config": {
        "subject_template": "Re: {{contact_first_name}}, just a nudge",
        "tone":             "friendly, very short",
        "goal_hint":        "One-liner reminder to grab a slot"
      }
    },
    {
      "id":           "mc_step4",
      "type":         "wait",
      "label":        "Wait 1 Day",
      "delay_hours":  24,
      "next_step_id": "mc_step5",
      "config": {}
    },
    {
      "id":             "mc_step5",
      "type":           "condition",
      "label":          "Meeting Booked?",
      "delay_hours":    0,
      "branch_yes_id":  "mc_step6_yes",
      "branch_no_id":   "mc_step6_no",
      "next_step_id":   null,
      "config": {
        "condition_label": "Calendar event detected or contact replied to confirm",
        "check":           "calendar_booked"
      }
    },
    {
      "id":           "mc_step6_yes",
      "type":         "send_email",
      "label":        "Meeting Confirmation",
      "delay_hours":  0,
      "next_step_id": "mc_step7",
      "config": {
        "subject_template": "Confirmed — see you soon, {{contact_first_name}}!",
        "tone":             "warm, brief confirmation",
        "goal_hint":        "Confirm the meeting details and set expectations"
      }
    },
    {
      "id":           "mc_step6_no",
      "type":         "send_email",
      "label":        "No-show Follow-up",
      "delay_hours":  0,
      "next_step_id": "mc_step7",
      "config": {
        "subject_template": "{{contact_first_name}} — still worth connecting?",
        "tone":             "understanding, non-pushy",
        "goal_hint":        "Acknowledge they might be busy, offer to reschedule easily"
      }
    },
    {
      "id":           "mc_step7",
      "type":         "handoff",
      "label":        "Sales Handoff",
      "delay_hours":  0,
      "next_step_id": null,
      "config": {
        "reason": "Meeting sequence complete — take over for the call prep"
      }
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;


-- ── 5. Lead Nurturing (email, 6 steps) ───────────────────────────────────────
-- Goal: warm_introduction (nurture variant) | Channel: multi
-- This is a longer nurture track for leads who aren't ready to buy yet.
-- Flow: value email → wait 5d → case study → wait 5d → check-in → wait 3d → offer → handoff

INSERT INTO automation_templates (
  workspace_id, name, description,
  automation_type, trigger_type, primary_channel,
  is_system, is_active, entry_step_id, steps
)
VALUES (
  NULL,
  'Lead Nurturing Track',
  'AI-managed long-form nurture: value content, social proof, and a well-timed offer for leads who need warming.',
  'warm_introduction', 'manual', 'multi',
  true, true,
  'ln_step1',
  '[
    {
      "id":           "ln_step1",
      "type":         "send_email",
      "label":        "Value Drop",
      "delay_hours":  0,
      "next_step_id": "ln_step2",
      "config": {
        "subject_template": "{{contact_first_name}}, thought you''d find this useful",
        "tone":             "generous, educational, no-ask",
        "goal_hint":        "Share a relevant tip, insight, or resource — no pitch"
      }
    },
    {
      "id":           "ln_step2",
      "type":         "wait",
      "label":        "Wait 5 Days",
      "delay_hours":  120,
      "next_step_id": "ln_step3",
      "config": {}
    },
    {
      "id":           "ln_step3",
      "type":         "send_email",
      "label":        "Social Proof",
      "delay_hours":  0,
      "next_step_id": "ln_step4",
      "config": {
        "subject_template": "How {{example_company}} achieved {{example_result}}",
        "tone":             "story-driven, relatable",
        "goal_hint":        "Share a short customer story relevant to their industry/problem"
      }
    },
    {
      "id":           "ln_step4",
      "type":         "wait",
      "label":        "Wait 5 Days",
      "delay_hours":  120,
      "next_step_id": "ln_step5",
      "config": {}
    },
    {
      "id":           "ln_step5",
      "type":         "send_email",
      "label":        "Check-in",
      "delay_hours":  0,
      "next_step_id": "ln_step6",
      "config": {
        "subject_template": "{{contact_first_name}} — any questions?",
        "tone":             "personal, low-key",
        "goal_hint":        "Ask if they have questions, invite a reply — keep it very short"
      }
    },
    {
      "id":           "ln_step6",
      "type":         "wait",
      "label":        "Wait 3 Days",
      "delay_hours":  72,
      "next_step_id": "ln_step7",
      "config": {}
    },
    {
      "id":           "ln_step7",
      "type":         "send_email",
      "label":        "Soft Offer",
      "delay_hours":  0,
      "next_step_id": "ln_step8",
      "config": {
        "subject_template": "{{contact_first_name}}, ready when you are",
        "tone":             "confident, no pressure, clear next step",
        "goal_hint":        "Make the offer — trial, call, or demo — keep it one click"
      }
    },
    {
      "id":           "ln_step8",
      "type":         "handoff",
      "label":        "Nurture Complete",
      "delay_hours":  0,
      "next_step_id": null,
      "config": {
        "reason": "Nurture track complete — review engagement and decide next move"
      }
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
