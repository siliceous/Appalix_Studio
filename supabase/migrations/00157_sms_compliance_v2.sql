-- ─────────────────────────────────────────────────────────────────────────────
-- SMS Compliance v2 — full A2P 10DLC schema replacing compliance_* tables
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Compliance profiles (one per workspace + country + type)
CREATE TABLE IF NOT EXISTS sms_compliance_profiles (
  id                           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id                 uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  country_code                 text        NOT NULL DEFAULT 'US',
  compliance_type              text        NOT NULL DEFAULT 'A2P_10DLC',
  status                       text        NOT NULL DEFAULT 'draft',
  -- Business identity
  legal_business_name          text,
  trading_name                 text,
  business_type                text,        -- private_company | public_company | nonprofit | government | sole_proprietor
  business_registration_number text,        -- EIN (US), ABN (AU), Companies House (GB), etc.
  tax_id_country               text,
  -- Address
  business_address_line1       text,
  business_address_line2       text,
  business_city                text,
  business_state_region        text,
  business_postcode            text,
  business_country             text,
  -- Online presence
  website_url                  text,
  industry                     text,
  privacy_policy_url           text,
  terms_url                    text,
  -- Contacts
  business_contact_name        text,
  business_contact_email       text,
  business_contact_phone       text,
  support_email                text,
  support_phone                text,
  -- Flags
  is_overseas_business         boolean     NOT NULL DEFAULT false,
  -- Status tracking
  rejection_reason             text,
  approved_at                  timestamptz,
  submitted_at                 timestamptz,
  created_at                   timestamptz DEFAULT now(),
  updated_at                   timestamptz DEFAULT now(),
  UNIQUE(workspace_id, country_code, compliance_type)
);

-- 2. Provider brand mapping (internal — never exposed to frontend)
CREATE TABLE IF NOT EXISTS sms_10dlc_brands (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id          uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  compliance_profile_id uuid        REFERENCES sms_compliance_profiles(id) ON DELETE CASCADE,
  provider              text        NOT NULL DEFAULT 'telnyx',
  provider_brand_id     text,        -- internal only, never sent to frontend
  brand_status          text        NOT NULL DEFAULT 'not_submitted',
  vetting_score         integer,
  provider_raw_status   jsonb       DEFAULT '{}',
  rejection_reason      text,
  submitted_at          timestamptz,
  approved_at           timestamptz,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- 3. SMS campaigns / use cases
CREATE TABLE IF NOT EXISTS sms_10dlc_campaigns (
  id                                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id                        uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  compliance_profile_id               uuid        REFERENCES sms_compliance_profiles(id) ON DELETE CASCADE,
  brand_id                            uuid        REFERENCES sms_10dlc_brands(id) ON DELETE SET NULL,
  provider                            text        NOT NULL DEFAULT 'telnyx',
  provider_campaign_id                text,        -- internal only
  campaign_name                       text        NOT NULL,
  use_case                            text        NOT NULL,
  campaign_description                text,
  message_flow                        text,
  expected_message_frequency          text,
  opt_in_keywords                     text[],
  opt_out_keywords                    text[]      DEFAULT ARRAY['STOP'],
  help_keywords                       text[]      DEFAULT ARRAY['HELP'],
  opt_in_message                      text,
  opt_out_message                     text,
  help_message                        text,
  sample_message_1                    text,
  sample_message_2                    text,
  sample_message_3                    text,
  has_embedded_links                  boolean     DEFAULT false,
  has_embedded_phone_numbers          boolean     DEFAULT false,
  age_gated_content                   boolean     DEFAULT false,
  direct_lending_or_financial_content boolean     DEFAULT false,
  campaign_status                     text        NOT NULL DEFAULT 'draft',
  rejection_reason                    text,
  provider_raw_status                 jsonb       DEFAULT '{}',
  submitted_at                        timestamptz,
  approved_at                         timestamptz,
  created_at                          timestamptz DEFAULT now(),
  updated_at                          timestamptz DEFAULT now()
);

-- 4. Consent records (opt-in evidence per recipient)
CREATE TABLE IF NOT EXISTS sms_consent_records (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id      uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id        uuid,
  phone_e164        text        NOT NULL,
  consent_source    text        NOT NULL,
  consent_text      text,
  opt_in_url        text,
  ip_address        inet,
  user_agent        text,
  consented_at      timestamptz NOT NULL,
  revoked_at        timestamptz,
  evidence_file_url text,
  metadata          jsonb       DEFAULT '{}',
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sms_consent_ws_phone ON sms_consent_records(workspace_id, phone_e164);

-- 5. Opt-out suppression list
CREATE TABLE IF NOT EXISTS sms_opt_outs (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  phone_e164   text        NOT NULL,
  channel      text        NOT NULL DEFAULT 'sms',
  opted_out_at timestamptz NOT NULL DEFAULT now(),
  source       text        NOT NULL,   -- stop_keyword | manual | api | complaint
  reason       text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(workspace_id, phone_e164, channel)
);
CREATE INDEX IF NOT EXISTS idx_sms_opt_outs_ws_phone ON sms_opt_outs(workspace_id, phone_e164);

-- 6. Supporting compliance documents
CREATE TABLE IF NOT EXISTS sms_compliance_documents (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id          uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  compliance_profile_id uuid        REFERENCES sms_compliance_profiles(id) ON DELETE CASCADE,
  document_type         text        NOT NULL,
  file_url              text        NOT NULL,
  file_name             text,
  mime_type             text,
  size_bytes            integer,
  uploaded_by           uuid,
  created_at            timestamptz DEFAULT now()
);

-- 7. Status event audit trail
CREATE TABLE IF NOT EXISTS sms_compliance_status_events (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id          uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  compliance_profile_id uuid        REFERENCES sms_compliance_profiles(id) ON DELETE CASCADE,
  entity_type           text        NOT NULL,   -- profile | brand | campaign | document
  entity_id             uuid,
  old_status            text,
  new_status            text        NOT NULL,
  reason                text,
  actor_type            text        NOT NULL,   -- user | admin | system | provider_webhook
  actor_id              uuid,
  metadata              jsonb       DEFAULT '{}',
  created_at            timestamptz DEFAULT now()
);

-- 8. Number ↔ campaign assignments
CREATE TABLE IF NOT EXISTS sms_number_campaign_assignments (
  id                     uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id           uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  phone_number_id        uuid        NOT NULL,
  campaign_id            uuid        REFERENCES sms_10dlc_campaigns(id) ON DELETE SET NULL,
  provider               text        DEFAULT 'telnyx',
  provider_assignment_id text,
  status                 text        NOT NULL DEFAULT 'pending',   -- pending | active | failed | removed
  error_message          text,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);
