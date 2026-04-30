-- ─────────────────────────────────────────────────────────────────────────────
-- New system automation templates
-- workspace_id IS NULL = built-in, available to every workspace
-- Safe to re-run: inserts only if name+type not already present
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  -- step IDs — Welcome Sequence
  ws1 uuid := 'a1000001-0000-0000-0000-000000000001';
  ws2 uuid := 'a1000001-0000-0000-0000-000000000002';
  ws3 uuid := 'a1000001-0000-0000-0000-000000000003';
  ws4 uuid := 'a1000001-0000-0000-0000-000000000004';
  ws5 uuid := 'a1000001-0000-0000-0000-000000000005';
  ws6 uuid := 'a1000001-0000-0000-0000-000000000006';

  -- step IDs — Abandoned Cart
  ac1 uuid := 'a2000001-0000-0000-0000-000000000001';
  ac2 uuid := 'a2000001-0000-0000-0000-000000000002';
  ac3 uuid := 'a2000001-0000-0000-0000-000000000003';
  ac4 uuid := 'a2000001-0000-0000-0000-000000000004';
  ac5 uuid := 'a2000001-0000-0000-0000-000000000005';
  ac6 uuid := 'a2000001-0000-0000-0000-000000000006';

  -- step IDs — Abandoned Checkout
  ach1 uuid := 'a3000001-0000-0000-0000-000000000001';
  ach2 uuid := 'a3000001-0000-0000-0000-000000000002';
  ach3 uuid := 'a3000001-0000-0000-0000-000000000003';
  ach4 uuid := 'a3000001-0000-0000-0000-000000000004';
  ach5 uuid := 'a3000001-0000-0000-0000-000000000005';

  -- step IDs — Product Review
  pr1 uuid := 'a4000001-0000-0000-0000-000000000001';
  pr2 uuid := 'a4000001-0000-0000-0000-000000000002';
  pr3 uuid := 'a4000001-0000-0000-0000-000000000003';
  pr4 uuid := 'a4000001-0000-0000-0000-000000000004';
  pr5 uuid := 'a4000001-0000-0000-0000-000000000005';

  -- step IDs — Wheel of Fortune
  wf1 uuid := 'a5000001-0000-0000-0000-000000000001';
  wf2 uuid := 'a5000001-0000-0000-0000-000000000002';
  wf3 uuid := 'a5000001-0000-0000-0000-000000000003';
  wf4 uuid := 'a5000001-0000-0000-0000-000000000004';
  wf5 uuid := 'a5000001-0000-0000-0000-000000000005';

  -- step IDs — Ticket Registered
  tr1 uuid := 'a6000001-0000-0000-0000-000000000001';
  tr2 uuid := 'a6000001-0000-0000-0000-000000000002';
  tr3 uuid := 'a6000001-0000-0000-0000-000000000003';
  tr4 uuid := 'a6000001-0000-0000-0000-000000000004';
  tr5 uuid := 'a6000001-0000-0000-0000-000000000005';
  tr6 uuid := 'a6000001-0000-0000-0000-000000000006';

  -- step IDs — Purchase Follow-up
  pf1 uuid := 'a7000001-0000-0000-0000-000000000001';
  pf2 uuid := 'a7000001-0000-0000-0000-000000000002';
  pf3 uuid := 'a7000001-0000-0000-0000-000000000003';
  pf4 uuid := 'a7000001-0000-0000-0000-000000000004';
  pf5 uuid := 'a7000001-0000-0000-0000-000000000005';

BEGIN

-- ── 1. Welcome Sequence ───────────────────────────────────────────────────────
INSERT INTO automation_templates (
  workspace_id, name, description, automation_type, trigger_type,
  primary_channel, entry_step_id, is_system, is_active, track, steps
)
SELECT NULL,
  'Welcome Sequence',
  'Sent when a new contact signs up or submits a lead capture form. Welcomes them and offers a discount.',
  'welcome', 'newsletter_signup', 'multi',
  ws1, true, true, 'Welcome & Onboarding',
  jsonb_build_array(
    jsonb_build_object('id', ws1, 'type', 'send_email', 'label', 'Welcome email',
      'delay_hours', 0,
      'config', jsonb_build_object(
        'subject', 'Welcome to {{company_name}}!',
        'body', 'Hi {{contact_first_name}}, thanks for joining us. We''re excited to have you on board.'
      ),
      'next_step_id', ws2),
    jsonb_build_object('id', ws2, 'type', 'wait', 'label', 'Wait 1 day',
      'config', jsonb_build_object('hours', 24),
      'next_step_id', ws3),
    jsonb_build_object('id', ws3, 'type', 'send_sms', 'label', 'SMS welcome',
      'config', jsonb_build_object(
        'message', 'Hi {{contact_first_name}}, welcome to {{company_name}}! 🎉 Reply STOP to unsubscribe.'
      ),
      'next_step_id', ws4),
    jsonb_build_object('id', ws4, 'type', 'wait', 'label', 'Wait 2 days',
      'config', jsonb_build_object('hours', 48),
      'next_step_id', ws5),
    jsonb_build_object('id', ws5, 'type', 'send_email', 'label', 'Discount offer',
      'config', jsonb_build_object(
        'subject', 'Here''s {{discount_percent}}% off — just for you',
        'body', 'Hi {{contact_first_name}}, use code {{discount_code}} for {{discount_percent}}% off. Valid until {{expiry_date}}.'
      ),
      'next_step_id', ws6),
    jsonb_build_object('id', ws6, 'type', 'end', 'label', 'End',
      'config', jsonb_build_object(),
      'next_step_id', NULL)
  )
WHERE NOT EXISTS (
  SELECT 1 FROM automation_templates
  WHERE is_system = true AND automation_type = 'welcome'
);

-- ── 2. Abandoned Cart Sequence ────────────────────────────────────────────────
INSERT INTO automation_templates (
  workspace_id, name, description, automation_type, trigger_type,
  primary_channel, entry_step_id, is_system, is_active, track, steps
)
SELECT NULL,
  'Abandoned Cart Sequence',
  'Triggered when a shopper adds items to cart but does not complete purchase. Recovers lost sales via email and SMS.',
  'abandoned_cart', 'cart_abandoned', 'multi',
  ac1, true, true, 'eCommerce Recovery',
  jsonb_build_array(
    jsonb_build_object('id', ac1, 'type', 'wait', 'label', 'Wait 1 hour',
      'config', jsonb_build_object('hours', 1),
      'next_step_id', ac2),
    jsonb_build_object('id', ac2, 'type', 'send_email', 'label', 'Cart reminder email',
      'config', jsonb_build_object(
        'subject', 'You left something behind!',
        'body', 'Hi {{contact_first_name}}, your cart is waiting. Complete your purchase: {{cart_url}}'
      ),
      'next_step_id', ac3),
    jsonb_build_object('id', ac3, 'type', 'wait', 'label', 'Wait 6 hours',
      'config', jsonb_build_object('hours', 6),
      'next_step_id', ac4),
    jsonb_build_object('id', ac4, 'type', 'send_sms', 'label', 'Cart SMS nudge',
      'config', jsonb_build_object(
        'message', 'Hi {{contact_first_name}}, your cart at {{company_name}} is still waiting! {{cart_url}} Reply STOP to unsubscribe.'
      ),
      'next_step_id', ac5),
    jsonb_build_object('id', ac5, 'type', 'wait', 'label', 'Wait 18 hours',
      'config', jsonb_build_object('hours', 18),
      'next_step_id', ac6),
    jsonb_build_object('id', ac6, 'type', 'send_email', 'label', 'Final urgency email',
      'config', jsonb_build_object(
        'subject', 'Last chance — your cart expires soon',
        'body', 'Hi {{contact_first_name}}, don''t miss out. Your items may sell out. Complete now: {{cart_url}}'
      ),
      'next_step_id', NULL)
  )
WHERE NOT EXISTS (
  SELECT 1 FROM automation_templates
  WHERE is_system = true AND automation_type = 'abandoned_cart'
);

-- ── 3. Abandoned Checkout Sequence ───────────────────────────────────────────
INSERT INTO automation_templates (
  workspace_id, name, description, automation_type, trigger_type,
  primary_channel, entry_step_id, is_system, is_active, track, steps
)
SELECT NULL,
  'Abandoned Checkout Sequence',
  'Triggered when a customer starts checkout but does not complete payment. Recovers high-intent buyers.',
  'abandoned_checkout', 'checkout_abandoned', 'multi',
  ach1, true, true, 'eCommerce Recovery',
  jsonb_build_array(
    jsonb_build_object('id', ach1, 'type', 'wait', 'label', 'Wait 30 minutes',
      'config', jsonb_build_object('hours', 0.5),
      'next_step_id', ach2),
    jsonb_build_object('id', ach2, 'type', 'send_email', 'label', 'Complete your order',
      'config', jsonb_build_object(
        'subject', 'Complete your order — you''re almost there!',
        'body', 'Hi {{contact_first_name}}, finish your purchase here: {{checkout_url}}'
      ),
      'next_step_id', ach3),
    jsonb_build_object('id', ach3, 'type', 'wait', 'label', 'Wait 2 hours',
      'config', jsonb_build_object('hours', 2),
      'next_step_id', ach4),
    jsonb_build_object('id', ach4, 'type', 'send_sms', 'label', 'Checkout SMS',
      'config', jsonb_build_object(
        'message', 'Hi {{contact_first_name}}, your order is waiting at {{company_name}}. Complete now: {{checkout_url}} Reply STOP to opt out.'
      ),
      'next_step_id', ach5),
    jsonb_build_object('id', ach5, 'type', 'send_email', 'label', 'Final reminder',
      'config', jsonb_build_object(
        'subject', 'Don''t miss out — complete your order',
        'body', 'Hi {{contact_first_name}}, this is your last reminder. Your order: {{checkout_url}}'
      ),
      'next_step_id', NULL)
  )
WHERE NOT EXISTS (
  SELECT 1 FROM automation_templates
  WHERE is_system = true AND automation_type = 'abandoned_checkout'
);

-- ── 4. Product Review Sequence ────────────────────────────────────────────────
INSERT INTO automation_templates (
  workspace_id, name, description, automation_type, trigger_type,
  primary_channel, entry_step_id, is_system, is_active, track, steps
)
SELECT NULL,
  'Product Review Sequence',
  'Sent after a purchase or service is complete. Collects reviews, routes happy customers to Google/Meta, routes unhappy customers to private feedback.',
  'product_review', 'purchase_completed', 'email',
  pr1, true, true, 'Reviews & Reputation',
  jsonb_build_array(
    jsonb_build_object('id', pr1, 'type', 'wait', 'label', 'Wait 24 hours',
      'config', jsonb_build_object('hours', 24),
      'next_step_id', pr2),
    jsonb_build_object('id', pr2, 'type', 'send_email', 'label', 'Review request',
      'config', jsonb_build_object(
        'subject', 'How was your experience with {{company_name}}?',
        'body', 'Hi {{contact_first_name}}, we hope you''re happy with your purchase. We''d love to hear your feedback — {{review_link}}'
      ),
      'next_step_id', pr3),
    jsonb_build_object('id', pr3, 'type', 'condition', 'label', 'Did they click review link?',
      'config', jsonb_build_object('check', 'email_clicked'),
      'branch_yes_id', pr4,
      'branch_no_id',  pr5,
      'next_step_id', NULL),
    jsonb_build_object('id', pr4, 'type', 'send_email', 'label', 'Thank you + public review prompt',
      'config', jsonb_build_object(
        'subject', 'Thank you! Would you share your review publicly?',
        'body', 'Hi {{contact_first_name}}, your feedback means a lot! Share it on Google: {{review_link}}'
      ),
      'next_step_id', NULL),
    jsonb_build_object('id', pr5, 'type', 'create_ticket', 'label', 'Create follow-up ticket',
      'config', jsonb_build_object(
        'title', 'Customer did not leave review — follow up',
        'priority', 'low'
      ),
      'next_step_id', NULL)
  )
WHERE NOT EXISTS (
  SELECT 1 FROM automation_templates
  WHERE is_system = true AND automation_type = 'product_review'
);

-- ── 5. Wheel of Fortune Offer Sequence ───────────────────────────────────────
INSERT INTO automation_templates (
  workspace_id, name, description, automation_type, trigger_type,
  primary_channel, entry_step_id, is_system, is_active, track, steps
)
SELECT NULL,
  'Wheel of Fortune Sequence',
  'Sent after a visitor spins a wheel widget and submits their email. Delivers the discount and follows up with urgency reminders.',
  'wheel_of_fortune', 'wheel_submitted', 'multi',
  wf1, true, true, 'Welcome & Onboarding',
  jsonb_build_array(
    jsonb_build_object('id', wf1, 'type', 'send_email', 'label', 'Send prize email',
      'delay_hours', 0,
      'config', jsonb_build_object(
        'subject', '🎉 You won {{discount_percent}}% off!',
        'body', 'Hi {{contact_first_name}}, congratulations! Use code {{discount_code}} for {{discount_percent}}% off. Expires {{expiry_date}}.'
      ),
      'next_step_id', wf2),
    jsonb_build_object('id', wf2, 'type', 'wait', 'label', 'Wait 1 day',
      'config', jsonb_build_object('hours', 24),
      'next_step_id', wf3),
    jsonb_build_object('id', wf3, 'type', 'send_sms', 'label', 'SMS reminder',
      'config', jsonb_build_object(
        'message', 'Hi {{contact_first_name}}, don''t forget your {{discount_percent}}% discount from {{company_name}}! Code: {{discount_code}} Reply STOP to opt out.'
      ),
      'next_step_id', wf4),
    jsonb_build_object('id', wf4, 'type', 'wait', 'label', 'Wait 2 days',
      'config', jsonb_build_object('hours', 48),
      'next_step_id', wf5),
    jsonb_build_object('id', wf5, 'type', 'send_email', 'label', 'Last chance email',
      'config', jsonb_build_object(
        'subject', 'Your discount expires soon!',
        'body', 'Hi {{contact_first_name}}, your {{discount_percent}}% off code {{discount_code}} expires {{expiry_date}}. Use it now!'
      ),
      'next_step_id', NULL)
  )
WHERE NOT EXISTS (
  SELECT 1 FROM automation_templates
  WHERE is_system = true AND automation_type = 'wheel_of_fortune'
);

-- ── 6. Ticket Registered Sequence ────────────────────────────────────────────
INSERT INTO automation_templates (
  workspace_id, name, description, automation_type, trigger_type,
  primary_channel, entry_step_id, is_system, is_active, track, steps
)
SELECT NULL,
  'Ticket Registered Sequence',
  'Sent when a new support ticket is created. Acknowledges the customer, notifies the team, and escalates if there is no response.',
  'ticket_registered', 'ticket_created', 'multi',
  tr1, true, true, 'Support',
  jsonb_build_array(
    jsonb_build_object('id', tr1, 'type', 'send_email', 'label', 'Ticket acknowledgement',
      'delay_hours', 0,
      'config', jsonb_build_object(
        'subject', 'We''ve received your request — Ticket #{{ticket_id}}',
        'body', 'Hi {{contact_first_name}}, your ticket has been registered. Our team will respond shortly. Reference: #{{ticket_id}}'
      ),
      'next_step_id', tr2),
    jsonb_build_object('id', tr2, 'type', 'send_sms', 'label', 'SMS confirmation',
      'config', jsonb_build_object(
        'message', 'Hi {{contact_first_name}}, ticket #{{ticket_id}} received at {{company_name}}. We''ll be in touch. Reply STOP to opt out.'
      ),
      'next_step_id', tr3),
    jsonb_build_object('id', tr3, 'type', 'notify_internal', 'label', 'Notify team',
      'config', jsonb_build_object(
        'message', 'New ticket #{{ticket_id}} from {{contact_first_name}} {{contact_last_name}} — {{contact_email}}'
      ),
      'next_step_id', tr4),
    jsonb_build_object('id', tr4, 'type', 'wait', 'label', 'Wait 24 hours',
      'config', jsonb_build_object('hours', 24),
      'next_step_id', tr5),
    jsonb_build_object('id', tr5, 'type', 'condition', 'label', 'Ticket resolved?',
      'config', jsonb_build_object('check', 'ticket_resolved'),
      'branch_yes_id', tr6,
      'branch_no_id',  NULL,
      'next_step_id', NULL),
    jsonb_build_object('id', tr6, 'type', 'send_email', 'label', 'Resolution confirmation',
      'config', jsonb_build_object(
        'subject', 'Your ticket #{{ticket_id}} has been resolved',
        'body', 'Hi {{contact_first_name}}, your support request has been resolved. If you have further questions, please get in touch.'
      ),
      'next_step_id', NULL)
  )
WHERE NOT EXISTS (
  SELECT 1 FROM automation_templates
  WHERE is_system = true AND automation_type = 'ticket_registered'
);

-- ── 7. Purchase Follow-up Sequence ───────────────────────────────────────────
INSERT INTO automation_templates (
  workspace_id, name, description, automation_type, trigger_type,
  primary_channel, entry_step_id, is_system, is_active, track, steps
)
SELECT NULL,
  'Purchase Follow-up Sequence',
  'Sent after a customer completes a purchase. Thanks them, provides onboarding, suggests upsells, and requests a review.',
  'purchase_followup', 'purchase_completed', 'email',
  pf1, true, true, 'Reviews & Reputation',
  jsonb_build_array(
    jsonb_build_object('id', pf1, 'type', 'send_email', 'label', 'Thank you email',
      'delay_hours', 0,
      'config', jsonb_build_object(
        'subject', 'Thank you for your purchase, {{contact_first_name}}!',
        'body', 'Hi {{contact_first_name}}, thank you for choosing {{company_name}}. Your order is confirmed. We''ll be in touch soon.'
      ),
      'next_step_id', pf2),
    jsonb_build_object('id', pf2, 'type', 'wait', 'label', 'Wait 3 days',
      'config', jsonb_build_object('hours', 72),
      'next_step_id', pf3),
    jsonb_build_object('id', pf3, 'type', 'send_email', 'label', 'Getting started tips',
      'config', jsonb_build_object(
        'subject', 'Getting the most from {{product_name}}',
        'body', 'Hi {{contact_first_name}}, here are some tips to get the most out of your purchase from {{company_name}}.'
      ),
      'next_step_id', pf4),
    jsonb_build_object('id', pf4, 'type', 'wait', 'label', 'Wait 7 days',
      'config', jsonb_build_object('hours', 168),
      'next_step_id', pf5),
    jsonb_build_object('id', pf5, 'type', 'send_email', 'label', 'Review request',
      'config', jsonb_build_object(
        'subject', 'How are you finding {{product_name}}?',
        'body', 'Hi {{contact_first_name}}, we hope you''re enjoying your purchase. We''d love your feedback: {{review_link}}'
      ),
      'next_step_id', NULL)
  )
WHERE NOT EXISTS (
  SELECT 1 FROM automation_templates
  WHERE is_system = true AND automation_type = 'purchase_followup'
);

END $$;
