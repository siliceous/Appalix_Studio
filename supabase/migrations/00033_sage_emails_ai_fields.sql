-- Add extended AI analysis fields to sage_emails
-- ai_action:   Claude-recommended action (create_lead, update_lead, reopen, create_ticket, reply_draft, ignore)
-- ai_entities: Extracted entities (name, company, phone, website, product_interest)
-- ai_reason:   1-sentence explanation of why this priority was assigned

alter table sage_emails
  add column if not exists ai_action   text,
  add column if not exists ai_entities jsonb,
  add column if not exists ai_reason   text;
