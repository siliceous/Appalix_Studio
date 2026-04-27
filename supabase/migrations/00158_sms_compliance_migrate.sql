-- ─────────────────────────────────────────────────────────────────────────────
-- Migrate data from old compliance_* tables → new sms_* tables, then drop old tables
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Migrate brand profiles → sms_compliance_profiles
INSERT INTO sms_compliance_profiles (
  id, workspace_id, country_code, compliance_type, status,
  legal_business_name, business_type, business_registration_number,
  business_address_line1, business_city, business_state_region,
  business_postcode, business_country,
  website_url, industry,
  business_contact_name, business_contact_email, business_contact_phone,
  is_overseas_business,
  rejection_reason, approved_at, submitted_at, created_at, updated_at
)
SELECT
  id,
  workspace_id,
  COALESCE(country, 'US'),
  'A2P_10DLC',
  CASE status
    WHEN 'approved'  THEN 'approved'
    WHEN 'submitted' THEN 'submitted'
    WHEN 'pending'   THEN 'submitted'
    WHEN 'rejected'  THEN 'rejected'
    ELSE 'draft'
  END,
  legal_name,
  CASE company_type
    WHEN 'private'    THEN 'private_company'
    WHEN 'public'     THEN 'public_company'
    WHEN 'non_profit' THEN 'nonprofit'
    WHEN 'government' THEN 'government'
    WHEN 'sole_prop'  THEN 'sole_proprietor'
    ELSE company_type
  END,
  ein,
  street,
  city,
  state,
  postal_code,
  COALESCE(country, 'US'),
  website_url,
  vertical,
  (contact_first || ' ' || contact_last),
  contact_email,
  contact_phone,
  CASE WHEN country IS NOT NULL AND country <> 'US' THEN true ELSE false END,
  rejection_reason,
  reviewed_at,
  submitted_at,
  created_at,
  updated_at
FROM compliance_brand_profiles
ON CONFLICT (workspace_id, country_code, compliance_type) DO NOTHING;

-- 2. Create brand records for migrated profiles that were submitted/approved
INSERT INTO sms_10dlc_brands (
  workspace_id, compliance_profile_id, provider,
  provider_brand_id, brand_status,
  rejection_reason, submitted_at, approved_at, created_at, updated_at
)
SELECT
  cbp.workspace_id,
  scp.id,
  'telnyx',
  cbp.telnyx_brand_id,
  CASE cbp.status
    WHEN 'approved'  THEN 'approved'
    WHEN 'submitted' THEN 'submitted'
    WHEN 'pending'   THEN 'pending'
    WHEN 'rejected'  THEN 'rejected'
    ELSE 'not_submitted'
  END,
  cbp.rejection_reason,
  cbp.submitted_at,
  cbp.reviewed_at,
  cbp.created_at,
  cbp.updated_at
FROM compliance_brand_profiles cbp
JOIN sms_compliance_profiles scp ON scp.workspace_id = cbp.workspace_id
  AND scp.country_code = COALESCE(cbp.country, 'US')
  AND scp.compliance_type = 'A2P_10DLC'
WHERE cbp.telnyx_brand_id IS NOT NULL OR cbp.status IN ('submitted','pending','approved','rejected');

-- 3. Migrate campaigns → sms_10dlc_campaigns
INSERT INTO sms_10dlc_campaigns (
  id, workspace_id, compliance_profile_id, brand_id,
  provider, provider_campaign_id,
  campaign_name, use_case, campaign_description,
  opt_out_keywords, help_keywords,
  opt_in_message, opt_out_message, help_message,
  sample_message_1, sample_message_2,
  has_embedded_links, has_embedded_phone_numbers,
  age_gated_content, direct_lending_or_financial_content,
  campaign_status,
  rejection_reason, submitted_at, approved_at, created_at, updated_at
)
SELECT
  cc.id,
  cc.workspace_id,
  scp.id,
  b.id,
  'telnyx',
  cc.telnyx_campaign_id,
  COALESCE(cc.name, 'Campaign'),
  COALESCE(cc.use_case, 'mixed'),
  cc.description,
  string_to_array(cc.opt_out_keywords, ', '),
  ARRAY['HELP'],
  NULL,
  NULL,
  NULL,
  cc.sample_message_1,
  cc.sample_message_2,
  cc.embedded_links,
  cc.embedded_phone,
  cc.age_gated,
  false,
  CASE cc.status
    WHEN 'approved'  THEN 'approved'
    WHEN 'submitted' THEN 'submitted'
    WHEN 'pending'   THEN 'submitted'
    WHEN 'rejected'  THEN 'rejected'
    ELSE 'draft'
  END,
  cc.rejection_reason,
  cc.submitted_at,
  cc.reviewed_at,
  cc.created_at,
  cc.updated_at
FROM compliance_campaigns cc
JOIN sms_compliance_profiles scp ON scp.workspace_id = cc.workspace_id
  AND scp.compliance_type = 'A2P_10DLC'
LEFT JOIN sms_10dlc_brands b ON b.workspace_id = cc.workspace_id
ON CONFLICT DO NOTHING;

-- 4. Migrate compliance documents
INSERT INTO sms_compliance_documents (
  id, workspace_id, compliance_profile_id,
  document_type, file_url, file_name, mime_type,
  created_at
)
SELECT
  cd.id,
  cd.workspace_id,
  scp.id,
  cd.document_type,
  cd.file_path,  -- stored path; app will generate signed URL at read time
  cd.file_name,
  cd.mime_type,
  cd.created_at
FROM compliance_documents cd
JOIN sms_compliance_profiles scp ON scp.workspace_id = cd.workspace_id
ON CONFLICT DO NOTHING;

-- 5. Migrate sage_contacts opt-outs → sms_opt_outs
INSERT INTO sms_opt_outs (workspace_id, phone_e164, channel, opted_out_at, source)
SELECT
  workspace_id,
  phone,
  'sms',
  COALESCE(sms_opted_out_at, now()),
  'manual'
FROM sage_contacts
WHERE sms_opt_out = true
  AND phone IS NOT NULL
  AND phone <> ''
ON CONFLICT (workspace_id, phone_e164, channel) DO NOTHING;

-- 6. Drop old compliance tables (data is now in sms_* tables)
DROP TABLE IF EXISTS compliance_campaigns CASCADE;
DROP TABLE IF EXISTS compliance_documents CASCADE;
DROP TABLE IF EXISTS compliance_brand_profiles CASCADE;
