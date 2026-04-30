-- ─────────────────────────────────────────────────────────────────────────────
-- Demo seed: Email Marketing campaigns, batches, recipients, usage metering
-- Run in Supabase SQL Editor (safe to re-run — uses DO block with checks)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_workspace_id  uuid;
  v_user_id       uuid;

  -- campaign IDs
  c_newsletter    uuid := gen_random_uuid();
  c_promo         uuid := gen_random_uuid();
  c_announce      uuid := gen_random_uuid();
  c_draft         uuid := gen_random_uuid();
  c_failed        uuid := gen_random_uuid();

  -- batch IDs
  b1 uuid := gen_random_uuid();
  b2 uuid := gen_random_uuid();
  b3 uuid := gen_random_uuid();
  b4 uuid := gen_random_uuid();

BEGIN
  -- Grab first workspace and an admin user
  SELECT id INTO v_workspace_id FROM workspaces ORDER BY created_at LIMIT 1;
  SELECT user_id INTO v_user_id FROM workspace_members WHERE workspace_id = v_workspace_id ORDER BY created_at LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'No workspace found — create one first.';
  END IF;

  -- ── Campaigns ────────────────────────────────────────────────────────────

  INSERT INTO email_campaigns (
    id, workspace_id, name, campaign_type, subject, preview_text,
    body_html, body_text, from_name, from_email, reply_to,
    recipient_filter, status, sent_at,
    total_recipients, sent_count, delivered_count, opened_count,
    clicked_count, bounced_count, complained_count, unsubscribed_count, failed_count,
    created_by, created_at, updated_at
  ) VALUES

  -- 1. Completed newsletter — good stats
  (
    c_newsletter, v_workspace_id,
    'April Newsletter — Product Updates', 'newsletter',
    'What''s new at Appalix this April 🚀', 'Three big updates you don''t want to miss',
    '<h1>April Updates</h1><p>Hi {{first_name}},</p><p>Here''s what we shipped this month...</p><p><a href="{{unsubscribe_link}}">Unsubscribe</a></p>',
    'Hi {{first_name}}, here''s what we shipped this month... {{unsubscribe_link}}',
    'Appalix Team', 'hello@appalix.com', 'support@appalix.com',
    '{"all": true}', 'completed',
    now() - interval '12 days',
    420, 415, 398, 187, 54, 6, 2, 11, 5,
    v_user_id, now() - interval '13 days', now() - interval '12 days'
  ),

  -- 2. Completed promotion — higher clicks
  (
    c_promo, v_workspace_id,
    'Spring Sale — 30% Off All Plans', 'promotion',
    '30% off this week only 🎉', 'Your exclusive discount inside',
    '<h1>Spring Sale</h1><p>Hi {{first_name}},</p><p>Use code SPRING30 at checkout for 30% off any plan.</p><p><a href="{{unsubscribe_link}}">Unsubscribe</a></p>',
    'Hi {{first_name}}, use SPRING30 for 30% off. {{unsubscribe_link}}',
    'Appalix Team', 'hello@appalix.com', null,
    '{"tags": ["lead", "trial"]}', 'completed',
    now() - interval '5 days',
    210, 208, 201, 143, 89, 3, 1, 5, 2,
    v_user_id, now() - interval '6 days', now() - interval '5 days'
  ),

  -- 3. Sending right now — in-progress
  (
    c_announce, v_workspace_id,
    'Introducing AI Voice Calls', 'announcement',
    'Your AI can now make phone calls 📞', 'Big news — launching today',
    '<h1>AI Voice is here</h1><p>Hi {{first_name}},</p><p>Your Appalix bot can now handle inbound and outbound calls.</p><p><a href="{{unsubscribe_link}}">Unsubscribe</a></p>',
    'Hi {{first_name}}, AI voice calls are live. {{unsubscribe_link}}',
    'Appalix Team', 'hello@appalix.com', null,
    '{"all": true}', 'sending',
    now() - interval '2 hours',
    380, 190, 182, 71, 18, 1, 0, 3, 0,
    v_user_id, now() - interval '1 day', now() - interval '2 hours'
  ),

  -- 4. Draft — not yet sent
  (
    c_draft, v_workspace_id,
    'Case Study: How Acme 3x''d Leads with Appalix', 'case_study',
    'How Acme tripled their lead volume in 60 days', null,
    '<h1>Case Study</h1><p>Hi {{first_name}},</p><p>See how Acme Corp automated their intake and 3x''d leads.</p><p><a href="{{unsubscribe_link}}">Unsubscribe</a></p>',
    null,
    'Appalix Team', 'hello@appalix.com', null,
    '{"tags": ["customer"]}', 'draft',
    null,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    v_user_id, now() - interval '2 days', now() - interval '1 day'
  ),

  -- 5. Failed — Resend key misconfigured
  (
    c_failed, v_workspace_id,
    'Re-engagement: We miss you!', 're_engagement',
    'It''s been a while — here''s what you''ve missed', 'Come back and see what''s new',
    '<h1>We miss you</h1><p>Hi {{first_name}},</p><p>A lot has changed since you last logged in.</p><p><a href="{{unsubscribe_link}}">Unsubscribe</a></p>',
    null,
    'Appalix Team', 'hello@appalix.com', null,
    '{"tags": ["inactive"]}', 'failed',
    now() - interval '20 days',
    95, 0, 0, 0, 0, 0, 0, 0, 95,
    v_user_id, now() - interval '21 days', now() - interval '20 days'
  );

  -- ── Batches (for completed campaigns) ────────────────────────────────────

  INSERT INTO email_send_batches (
    id, workspace_id, campaign_id, batch_number, recipient_count, status,
    send_after, sent_count, failed_count, opened_count, clicked_count,
    bounced_count, complained_count, created_at, updated_at
  ) VALUES
  -- Newsletter batches (420 recipients = 5 batches)
  (b1, v_workspace_id, c_newsletter, 1, 100, 'completed', now() - interval '12 days', 99, 1, 46, 13, 2, 1, now() - interval '12 days', now() - interval '12 days'),
  (b2, v_workspace_id, c_newsletter, 2, 100, 'completed', now() - interval '12 days', 100, 0, 41, 12, 1, 0, now() - interval '12 days', now() - interval '12 days'),
  -- Promo batches
  (b3, v_workspace_id, c_promo, 1, 100, 'completed', now() - interval '5 days', 100, 0, 70, 45, 2, 1, now() - interval '5 days', now() - interval '5 days'),
  (b4, v_workspace_id, c_promo, 2, 100, 'completed', now() - interval '5 days', 100, 0, 65, 38, 1, 0, now() - interval '5 days', now() - interval '5 days');

  -- ── Recipients (sample rows for the completed newsletter batch) ───────────

  INSERT INTO email_campaign_recipients (
    workspace_id, campaign_id, batch_id, email, name,
    status, resend_email_id, sent_at, opened_at, clicked_at
  ) VALUES
  (v_workspace_id, c_newsletter, b1, 'alice@example.com',  'Alice Martin',   'clicked',   'resend_abc001', now()-interval '12 days', now()-interval '11 days 18h', now()-interval '11 days 17h'),
  (v_workspace_id, c_newsletter, b1, 'bob@example.com',    'Bob Chen',       'opened',    'resend_abc002', now()-interval '12 days', now()-interval '11 days 14h', null),
  (v_workspace_id, c_newsletter, b1, 'carol@example.com',  'Carol Smith',    'delivered', 'resend_abc003', now()-interval '12 days', null, null),
  (v_workspace_id, c_newsletter, b1, 'dave@example.com',   'Dave Johnson',   'bounced',   'resend_abc004', now()-interval '12 days', null, null),
  (v_workspace_id, c_newsletter, b1, 'eve@example.com',    'Eve Williams',   'clicked',   'resend_abc005', now()-interval '12 days', now()-interval '11 days 20h', now()-interval '11 days 19h'),
  (v_workspace_id, c_newsletter, b1, 'frank@example.com',  'Frank Davis',    'opened',    'resend_abc006', now()-interval '12 days', now()-interval '11 days 10h', null),
  (v_workspace_id, c_newsletter, b1, 'grace@example.com',  'Grace Lee',      'delivered', 'resend_abc007', now()-interval '12 days', null, null),
  (v_workspace_id, c_newsletter, b1, 'henry@example.com',  'Henry Wilson',   'unsubscribed', 'resend_abc008', now()-interval '12 days', null, null),
  (v_workspace_id, c_newsletter, b1, 'iris@example.com',   'Iris Taylor',    'clicked',   'resend_abc009', now()-interval '12 days', now()-interval '11 days 16h', now()-interval '11 days 15h'),
  (v_workspace_id, c_newsletter, b1, 'jack@example.com',   'Jack Anderson',  'complained','resend_abc010', now()-interval '12 days', null, null),
  -- Promo recipients
  (v_workspace_id, c_promo, b3, 'alice@example.com',  'Alice Martin',  'clicked',   'resend_promo01', now()-interval '5 days', now()-interval '4 days 20h', now()-interval '4 days 18h'),
  (v_workspace_id, c_promo, b3, 'bob@example.com',    'Bob Chen',      'clicked',   'resend_promo02', now()-interval '5 days', now()-interval '4 days 19h', now()-interval '4 days 17h'),
  (v_workspace_id, c_promo, b3, 'carol@example.com',  'Carol Smith',   'opened',    'resend_promo03', now()-interval '5 days', now()-interval '4 days 16h', null),
  (v_workspace_id, c_promo, b3, 'dave@example.com',   'Dave Johnson',  'bounced',   'resend_promo04', now()-interval '5 days', null, null),
  (v_workspace_id, c_promo, b3, 'eve@example.com',    'Eve Williams',  'clicked',   'resend_promo05', now()-interval '5 days', now()-interval '4 days 14h', now()-interval '4 days 12h');

  -- ── Usage metering ────────────────────────────────────────────────────────

  INSERT INTO email_usage_metering (
    workspace_id, billing_period, emails_sent, campaign_emails_sent,
    automation_emails_sent, contacts_count, ai_generations_count,
    created_at, updated_at
  ) VALUES
  (v_workspace_id, '2026-02', 312, 312, 0, 380, 14, now()-interval '58 days', now()-interval '58 days'),
  (v_workspace_id, '2026-03', 710, 710, 0, 415, 31, now()-interval '28 days', now()-interval '28 days'),
  (v_workspace_id, '2026-04', 623, 623, 0, 420, 22, now(),                    now())
  ON CONFLICT (workspace_id, billing_period) DO UPDATE
    SET emails_sent          = EXCLUDED.emails_sent,
        campaign_emails_sent = EXCLUDED.campaign_emails_sent,
        contacts_count       = EXCLUDED.contacts_count,
        updated_at           = now();

  RAISE NOTICE 'Demo data inserted for workspace %', v_workspace_id;
END $$;
