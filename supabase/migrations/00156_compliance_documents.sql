-- Supporting documents per country per brand profile
CREATE TABLE IF NOT EXISTS compliance_documents (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id     uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_profile_id uuid        REFERENCES compliance_brand_profiles(id) ON DELETE CASCADE,
  document_type    text        NOT NULL,
  country          text        NOT NULL DEFAULT 'US',
  file_name        text        NOT NULL,
  file_path        text        NOT NULL,
  file_size        integer,
  mime_type        text,
  uploaded_at      timestamptz DEFAULT now(),
  created_at       timestamptz DEFAULT now(),
  UNIQUE(workspace_id, brand_profile_id, document_type, country)
);

-- Track which additional countries the workspace needs docs for (beyond brand primary country)
ALTER TABLE compliance_brand_profiles
  ADD COLUMN IF NOT EXISTS additional_countries text[] DEFAULT '{}';

-- Private storage bucket for compliance documents (10 MB max, PDF and images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance-docs',
  'compliance-docs',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
