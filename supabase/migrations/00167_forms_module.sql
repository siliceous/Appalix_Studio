-- ============================================================
-- Forms Module
-- Tables: forms_templates, forms, form_versions,
--         form_submissions, form_events, form_public_tokens
-- ============================================================

-- ── forms_templates ───────────────────────────────────────────────────────────

create table if not exists forms_templates (
  id                 uuid        primary key default gen_random_uuid(),
  workspace_id       uuid        references workspaces(id) on delete cascade,
  name               text        not null,
  description        text,
  preview_image_url  text,
  type               text        not null check (type in ('popup','embedded','landing_page','flyout')),
  goal               text        not null check (goal in ('collect_subscribers','stop_abandonment','promote_offers','out_of_stock_interest')),
  channel_mode       text        not null check (channel_mode in ('email_only','sms_only','email_sms')),
  is_multi_step      boolean     not null default false,
  is_system_template boolean     not null default false,
  tags               text[]      not null default '{}',
  category           text,
  config             jsonb       not null default '{}',
  theme              jsonb       not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists forms_templates_workspace_id_idx on forms_templates(workspace_id);
create index if not exists forms_templates_type_idx         on forms_templates(type);
create index if not exists forms_templates_goal_idx         on forms_templates(goal);
create index if not exists forms_templates_channel_idx      on forms_templates(channel_mode);
create index if not exists forms_templates_system_idx       on forms_templates(is_system_template);

-- ── forms ─────────────────────────────────────────────────────────────────────

create table if not exists forms (
  id                uuid        primary key default gen_random_uuid(),
  workspace_id      uuid        not null references workspaces(id) on delete cascade,
  template_id       uuid        references forms_templates(id) on delete set null,
  name              text        not null,
  status            text        not null default 'draft'
                                check (status in ('draft','published','paused','archived')),
  type              text        not null
                                check (type in ('popup','embedded','landing_page','flyout')),
  channel_mode      text        not null
                                check (channel_mode in ('email_only','sms_only','email_sms')),
  steps             jsonb       not null default '[]',
  blocks            jsonb       not null default '[]',
  behaviour         jsonb       not null default '{}',
  theme             jsonb       not null default '{}',
  published_version integer     not null default 0,
  public_slug       text        unique,
  embed_key         text        unique,
  created_by        uuid        references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  published_at      timestamptz
);

create index if not exists forms_workspace_id_idx on forms(workspace_id);
create index if not exists forms_status_idx       on forms(status);
create index if not exists forms_public_slug_idx  on forms(public_slug);
create index if not exists forms_embed_key_idx    on forms(embed_key);
create index if not exists forms_template_id_idx  on forms(template_id);

-- ── form_versions ─────────────────────────────────────────────────────────────

create table if not exists form_versions (
  id             uuid        primary key default gen_random_uuid(),
  form_id        uuid        not null references forms(id) on delete cascade,
  workspace_id   uuid        not null references workspaces(id) on delete cascade,
  version_number integer     not null,
  snapshot       jsonb       not null,
  created_by     uuid        references auth.users(id),
  created_at     timestamptz not null default now(),
  unique (form_id, version_number)
);

create index if not exists form_versions_form_id_idx on form_versions(form_id);

-- ── form_submissions ──────────────────────────────────────────────────────────

create table if not exists form_submissions (
  id                 uuid        primary key default gen_random_uuid(),
  workspace_id       uuid        not null references workspaces(id) on delete cascade,
  form_id            uuid        not null references forms(id) on delete cascade,
  form_version       integer,
  contact_id         uuid        references sage_contacts(id) on delete set null,
  deal_id            uuid        references sage_deals(id)    on delete set null,
  submitted_data     jsonb       not null default '{}',
  email              text,
  phone              text,
  first_name         text,
  last_name          text,
  full_name          text,
  source_url         text,
  referrer           text,
  utm_source         text,
  utm_medium         text,
  utm_campaign       text,
  utm_content        text,
  utm_term           text,
  user_agent         text,
  ip_hash            text,
  consent_email      boolean     not null default false,
  consent_sms        boolean     not null default false,
  consent_marketing  boolean     not null default false,
  status             text        not null default 'new'
                                 check (status in ('new','processed','failed','spam')),
  ai_summary         text,
  created_at         timestamptz not null default now()
);

create index if not exists form_submissions_workspace_id_idx on form_submissions(workspace_id);
create index if not exists form_submissions_form_id_idx      on form_submissions(form_id);
create index if not exists form_submissions_contact_id_idx   on form_submissions(contact_id);
create index if not exists form_submissions_email_idx        on form_submissions(email);
create index if not exists form_submissions_phone_idx        on form_submissions(phone);
create index if not exists form_submissions_created_at_idx   on form_submissions(created_at desc);

-- ── form_events ───────────────────────────────────────────────────────────────

create table if not exists form_events (
  id           uuid        primary key default gen_random_uuid(),
  workspace_id uuid        not null references workspaces(id) on delete cascade,
  form_id      uuid        not null references forms(id) on delete cascade,
  event_type   text        not null
               check (event_type in ('view','step_view','submit','close','conversion','error')),
  session_id   text,
  step_id      text,
  metadata     jsonb       not null default '{}',
  source_url   text,
  referrer     text,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index if not exists form_events_workspace_id_idx on form_events(workspace_id);
create index if not exists form_events_form_id_idx      on form_events(form_id);
create index if not exists form_events_event_type_idx   on form_events(event_type);
create index if not exists form_events_created_at_idx   on form_events(created_at desc);
create index if not exists form_events_session_id_idx   on form_events(session_id);

-- ── form_public_tokens ────────────────────────────────────────────────────────

create table if not exists form_public_tokens (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references workspaces(id) on delete cascade,
  form_id         uuid        not null references forms(id) on delete cascade,
  token           text        unique not null,
  allowed_domains text[]      not null default '{}',
  is_active       boolean     not null default true,
  created_at      timestamptz not null default now(),
  revoked_at      timestamptz
);

create index if not exists form_public_tokens_token_idx        on form_public_tokens(token);
create index if not exists form_public_tokens_form_id_idx      on form_public_tokens(form_id);
create index if not exists form_public_tokens_workspace_id_idx on form_public_tokens(workspace_id);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table forms_templates    enable row level security;
alter table forms              enable row level security;
alter table form_versions      enable row level security;
alter table form_submissions   enable row level security;
alter table form_events        enable row level security;
alter table form_public_tokens enable row level security;

-- forms_templates: system templates readable by all auth; workspace templates by members only
create policy "forms_templates_select" on forms_templates
  for select to authenticated
  using (
    is_system_template = true
    or workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

create policy "forms_templates_workspace_write" on forms_templates
  for all to authenticated
  using    (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

-- forms: workspace members full access
create policy "forms_workspace_all" on forms
  for all to authenticated
  using    (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

-- form_versions: workspace members full access
create policy "form_versions_workspace_all" on form_versions
  for all to authenticated
  using    (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

-- form_submissions: workspace members read only; service role writes
create policy "form_submissions_workspace_read" on form_submissions
  for select to authenticated
  using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

-- form_events: workspace members read only; service role writes
create policy "form_events_workspace_read" on form_events
  for select to authenticated
  using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

-- form_public_tokens: workspace members full access
create policy "form_public_tokens_workspace_all" on form_public_tokens
  for all to authenticated
  using    (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

-- ── System template seed data ─────────────────────────────────────────────────

insert into forms_templates (
  name, description, type, goal, channel_mode,
  is_multi_step, is_system_template, tags, category, config, theme
) values

-- 1. Welcome Discount Popup
(
  'Welcome Discount',
  'Capture emails with an instant discount — the highest-converting first-touch popup.',
  'popup', 'collect_subscribers', 'email_only', false, true,
  '{welcome,discount,email}', 'E-commerce',
  '{"steps":[{"id":"step_1","name":"Step 1","order":1,"type":"input"},{"id":"success","name":"Success","order":99,"type":"success"}],"blocks":[{"id":"b_heading","stepId":"step_1","type":"text","props":{"content":"GET 10% OFF YOUR FIRST ORDER","variant":"heading"}},{"id":"b_sub","stepId":"step_1","type":"text","props":{"content":"Be the first to hear about new drops and exclusive offers.","variant":"body"}},{"id":"b_email","stepId":"step_1","type":"email","props":{"label":"Email address","placeholder":"Enter your email","required":true}},{"id":"b_btn","stepId":"step_1","type":"button","props":{"label":"GET 10% OFF","action":"submit"}},{"id":"b_ok","stepId":"success","type":"text","props":{"content":"Your discount code is on its way.","variant":"heading"}}]}',
  '{"colors":{"primary":"#0ea5e9","background":"#ffffff","text":"#111827","muted":"#6b7280"},"typography":{"fontFamily":"Inter","headingSize":"28px","bodySize":"14px"},"buttons":{"radius":"8px","style":"solid"},"fields":{"radius":"6px","borderColor":"#111827"},"modal":{"width":"520px","radius":"0px","shadow":"medium"}}'
),

-- 2. Exit Intent
(
  'Exit Intent Offer',
  'Show a last-chance offer the moment a visitor is about to leave.',
  'popup', 'stop_abandonment', 'email_only', false, true,
  '{exit,abandonment,popup}', 'E-commerce',
  '{"steps":[{"id":"step_1","name":"Step 1","order":1,"type":"input"},{"id":"success","name":"Success","order":99,"type":"success"}],"blocks":[{"id":"b_heading","stepId":"step_1","type":"text","props":{"content":"Wait! Before You Go...","variant":"heading"}},{"id":"b_sub","stepId":"step_1","type":"text","props":{"content":"Enter your email for a special offer before you leave.","variant":"body"}},{"id":"b_email","stepId":"step_1","type":"email","props":{"label":"Email","placeholder":"Your email address","required":true}},{"id":"b_btn","stepId":"step_1","type":"button","props":{"label":"Claim My Offer","action":"submit"}},{"id":"b_ok","stepId":"success","type":"text","props":{"content":"Offer sent! Check your inbox.","variant":"heading"}}]}',
  '{"colors":{"primary":"#f97316","background":"#1f2937","text":"#f9fafb","muted":"#9ca3af"},"typography":{"fontFamily":"Inter","headingSize":"26px","bodySize":"14px"},"buttons":{"radius":"6px","style":"solid"},"fields":{"radius":"6px","borderColor":"#374151"},"modal":{"width":"480px","radius":"12px","shadow":"large"}}'
),

-- 3. SMS Deals Flyout
(
  'SMS Deals Flyout',
  'Grow your SMS subscriber list with a sleek mobile-first flyout.',
  'flyout', 'promote_offers', 'sms_only', false, true,
  '{sms,deals,flyout}', 'E-commerce',
  '{"steps":[{"id":"step_1","name":"Step 1","order":1,"type":"input"},{"id":"success","name":"Success","order":99,"type":"success"}],"blocks":[{"id":"b_heading","stepId":"step_1","type":"text","props":{"content":"Get Exclusive SMS Deals","variant":"heading"}},{"id":"b_sub","stepId":"step_1","type":"text","props":{"content":"Sign up for first access to our best offers.","variant":"body"}},{"id":"b_phone","stepId":"step_1","type":"phone","props":{"label":"Mobile number","placeholder":"+1 555 000 0000","required":true}},{"id":"b_btn","stepId":"step_1","type":"button","props":{"label":"Sign Me Up","action":"submit"}},{"id":"b_ok","stepId":"success","type":"text","props":{"content":"You are in! Watch for our next deal.","variant":"heading"}}]}',
  '{"colors":{"primary":"#7c3aed","background":"#ffffff","text":"#111827","muted":"#6b7280"},"typography":{"fontFamily":"Inter","headingSize":"22px","bodySize":"13px"},"buttons":{"radius":"999px","style":"solid"},"fields":{"radius":"8px","borderColor":"#d1d5db"},"modal":{"width":"360px","radius":"16px","shadow":"medium"}}'
),

-- 4. Email + SMS Two-Step
(
  'Email + SMS Welcome',
  'Two-step signup to collect both email and phone — maximise your subscriber list.',
  'popup', 'collect_subscribers', 'email_sms', true, true,
  '{welcome,email,sms,multi-step}', 'E-commerce',
  '{"steps":[{"id":"step_1","name":"Email","order":1,"type":"input"},{"id":"step_2","name":"Mobile","order":2,"type":"input"},{"id":"success","name":"Success","order":99,"type":"success"}],"blocks":[{"id":"b_heading","stepId":"step_1","type":"text","props":{"content":"Join Our Community","variant":"heading"}},{"id":"b_sub","stepId":"step_1","type":"text","props":{"content":"Get offers, updates and early access.","variant":"body"}},{"id":"b_email","stepId":"step_1","type":"email","props":{"label":"Email","placeholder":"Enter your email","required":true}},{"id":"b_btn1","stepId":"step_1","type":"button","props":{"label":"Continue","action":"next_step"}},{"id":"b_phone","stepId":"step_2","type":"phone","props":{"label":"Mobile number","placeholder":"+1 555 000 0000","required":false}},{"id":"b_btn2","stepId":"step_2","type":"button","props":{"label":"Subscribe","action":"submit"}},{"id":"b_ok","stepId":"success","type":"text","props":{"content":"Welcome! You are all signed up.","variant":"heading"}}]}',
  '{"colors":{"primary":"#10b981","background":"#ffffff","text":"#111827","muted":"#6b7280"},"typography":{"fontFamily":"Inter","headingSize":"26px","bodySize":"14px"},"buttons":{"radius":"8px","style":"solid"},"fields":{"radius":"6px","borderColor":"#d1d5db"},"modal":{"width":"500px","radius":"12px","shadow":"medium"}}'
),

-- 5. Back in Stock
(
  'Back in Stock Alert',
  'Notify customers the moment an out-of-stock item is available again.',
  'popup', 'out_of_stock_interest', 'email_sms', false, true,
  '{back-in-stock,alert,inventory}', 'E-commerce',
  '{"steps":[{"id":"step_1","name":"Step 1","order":1,"type":"input"},{"id":"success","name":"Success","order":99,"type":"success"}],"blocks":[{"id":"b_heading","stepId":"step_1","type":"text","props":{"content":"Notify Me When It Is Back","variant":"heading"}},{"id":"b_sub","stepId":"step_1","type":"text","props":{"content":"We will let you know the moment this item is available.","variant":"body"}},{"id":"b_email","stepId":"step_1","type":"email","props":{"label":"Email","placeholder":"Enter your email","required":true}},{"id":"b_phone","stepId":"step_1","type":"phone","props":{"label":"Or get an SMS","placeholder":"+1 555 000 0000","required":false}},{"id":"b_btn","stepId":"step_1","type":"button","props":{"label":"Notify Me","action":"submit"}},{"id":"b_ok","stepId":"success","type":"text","props":{"content":"Done! We will message you as soon as it is back.","variant":"heading"}}]}',
  '{"colors":{"primary":"#3b82f6","background":"#ffffff","text":"#111827","muted":"#6b7280"},"typography":{"fontFamily":"Inter","headingSize":"24px","bodySize":"14px"},"buttons":{"radius":"8px","style":"solid"},"fields":{"radius":"6px","borderColor":"#d1d5db"},"modal":{"width":"480px","radius":"8px","shadow":"small"}}'
),

-- 6. Newsletter Embedded
(
  'Newsletter Signup',
  'Clean, minimal embedded signup — perfect for blog sidebars and content sites.',
  'embedded', 'collect_subscribers', 'email_only', false, true,
  '{newsletter,embedded,content}', 'Content',
  '{"steps":[{"id":"step_1","name":"Step 1","order":1,"type":"input"},{"id":"success","name":"Success","order":99,"type":"success"}],"blocks":[{"id":"b_heading","stepId":"step_1","type":"text","props":{"content":"Stay in the Loop","variant":"heading"}},{"id":"b_sub","stepId":"step_1","type":"text","props":{"content":"Get our latest articles and updates, no spam ever.","variant":"body"}},{"id":"b_email","stepId":"step_1","type":"email","props":{"label":"Email address","placeholder":"you@example.com","required":true}},{"id":"b_btn","stepId":"step_1","type":"button","props":{"label":"Subscribe","action":"submit"}},{"id":"b_ok","stepId":"success","type":"text","props":{"content":"Subscribed! Thanks for joining.","variant":"heading"}}]}',
  '{"colors":{"primary":"#6366f1","background":"#f9fafb","text":"#111827","muted":"#6b7280"},"typography":{"fontFamily":"Inter","headingSize":"22px","bodySize":"14px"},"buttons":{"radius":"6px","style":"solid"},"fields":{"radius":"6px","borderColor":"#e5e7eb"},"modal":{"width":"100%","radius":"12px","shadow":"none"}}'
),

-- 7. Lead Generation Landing Page
(
  'Lead Generation',
  'A full landing page to capture leads with name, email and a message field.',
  'landing_page', 'collect_subscribers', 'email_only', false, true,
  '{lead-gen,landing-page,contact}', 'Lead Generation',
  '{"steps":[{"id":"step_1","name":"Step 1","order":1,"type":"input"},{"id":"success","name":"Success","order":99,"type":"success"}],"blocks":[{"id":"b_heading","stepId":"step_1","type":"text","props":{"content":"Get a Free Consultation","variant":"heading"}},{"id":"b_sub","stepId":"step_1","type":"text","props":{"content":"Tell us about your project and we will be in touch within 24 hours.","variant":"body"}},{"id":"b_fname","stepId":"step_1","type":"text_input","props":{"label":"Full name","placeholder":"Your name","required":true}},{"id":"b_email","stepId":"step_1","type":"email","props":{"label":"Email address","placeholder":"you@company.com","required":true}},{"id":"b_phone","stepId":"step_1","type":"phone","props":{"label":"Phone","placeholder":"+1 555 000 0000","required":false}},{"id":"b_msg","stepId":"step_1","type":"textarea","props":{"label":"How can we help?","placeholder":"Tell us about your project...","required":false}},{"id":"b_btn","stepId":"step_1","type":"button","props":{"label":"Send My Request","action":"submit"}},{"id":"b_ok","stepId":"success","type":"text","props":{"content":"Thanks! We will be in touch shortly.","variant":"heading"}}]}',
  '{"colors":{"primary":"#0f172a","background":"#ffffff","text":"#0f172a","muted":"#64748b"},"typography":{"fontFamily":"Inter","headingSize":"32px","bodySize":"16px"},"buttons":{"radius":"8px","style":"solid"},"fields":{"radius":"6px","borderColor":"#cbd5e1"},"modal":{"width":"600px","radius":"0px","shadow":"none"}}'
);
