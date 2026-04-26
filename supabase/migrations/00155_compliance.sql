-- A2P brand registration (one per workspace)
CREATE TABLE IF NOT EXISTS compliance_brand_profiles (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id        uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  status              text        NOT NULL DEFAULT 'draft',  -- draft | submitted | pending | approved | rejected
  legal_name          text,
  ein                 text,
  company_type        text,       -- sole_prop | private | public | non_profit | government
  vertical            text,
  website_url         text,
  street              text,
  city                text,
  state               text,
  postal_code         text,
  country             text        DEFAULT 'US',
  contact_first       text,
  contact_last        text,
  contact_email       text,
  contact_phone       text,
  stock_symbol        text,
  stock_exchange      text,
  telnyx_brand_id     text,
  rejection_reason    text,
  submitted_at        timestamptz,
  reviewed_at         timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE(workspace_id)
);

-- A2P campaigns (many per workspace, require approved brand)
CREATE TABLE IF NOT EXISTS compliance_campaigns (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id        uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_profile_id    uuid        REFERENCES compliance_brand_profiles(id) ON DELETE SET NULL,
  name                text,
  status              text        NOT NULL DEFAULT 'draft',  -- draft | submitted | pending | approved | rejected
  use_case            text,
  description         text,
  sample_message_1    text,
  sample_message_2    text,
  opt_in_description  text,
  opt_out_keywords    text        DEFAULT 'STOP, UNSUBSCRIBE',
  help_message        text,
  embedded_links      boolean     NOT NULL DEFAULT false,
  embedded_phone      boolean     NOT NULL DEFAULT false,
  affiliate_marketing boolean     NOT NULL DEFAULT false,
  age_gated           boolean     NOT NULL DEFAULT false,
  telnyx_campaign_id  text,
  rejection_reason    text,
  submitted_at        timestamptz,
  reviewed_at         timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- SHAKEN/STIR, CNAM, Voice Integrity registrations (one row per type per workspace)
CREATE TABLE IF NOT EXISTS compliance_registrations (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type         text        NOT NULL,  -- shaken_stir | cnam | voice_integrity
  status       text        NOT NULL DEFAULT 'not_started',  -- not_started | pending | active | rejected
  data         jsonb                DEFAULT '{}',
  provider_id  text,
  submitted_at timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(workspace_id, type)
);
