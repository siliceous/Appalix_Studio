-- Add AI classification fields to sage_emails
alter table sage_emails
  add column if not exists ai_category   text,   -- 'Sales' | 'Support' | 'Other'
  add column if not exists ai_user_prompt text;  -- short sentence to show user: "Looks like a sales inquiry. Create a lead?"
