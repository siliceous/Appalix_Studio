-- Add Row Level Security to 7 critical tables missing RLS policies
-- These tables contain workspace-scoped data (brand assets, forms, PII)
-- See audit: 95% of 123 tables have RLS; these 7 are the gap

-- ============================================================================
-- 1. Brand Profiles - Workspace branding settings
-- ============================================================================
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view brand profiles in their workspace"
  ON brand_profiles FOR SELECT
  USING (workspace_id IN (SELECT public.my_workspace_ids()));

CREATE POLICY "Admins can insert brand profiles"
  ON brand_profiles FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can update brand profiles"
  ON brand_profiles FOR UPDATE
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can delete brand profiles"
  ON brand_profiles FOR DELETE
  USING (public.is_workspace_admin(workspace_id));

-- ============================================================================
-- 2. Brand Assets - Logos and uploaded brand images
-- ============================================================================
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view brand assets in their workspace"
  ON brand_assets FOR SELECT
  USING (workspace_id IN (SELECT public.my_workspace_ids()));

CREATE POLICY "Admins can insert brand assets"
  ON brand_assets FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can update brand assets"
  ON brand_assets FOR UPDATE
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can delete brand assets"
  ON brand_assets FOR DELETE
  USING (public.is_workspace_admin(workspace_id));

-- ============================================================================
-- 3. Brand Email Templates - Generated email designs and copy
-- ============================================================================
ALTER TABLE brand_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view email templates in their workspace"
  ON brand_email_templates FOR SELECT
  USING (workspace_id IN (SELECT public.my_workspace_ids()));

CREATE POLICY "Admins can insert email templates"
  ON brand_email_templates FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can update email templates"
  ON brand_email_templates FOR UPDATE
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can delete email templates"
  ON brand_email_templates FOR DELETE
  USING (public.is_workspace_admin(workspace_id));

-- ============================================================================
-- 4. Brand Forms - Lead capture form configurations
-- ============================================================================
ALTER TABLE brand_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view brand forms in their workspace"
  ON brand_forms FOR SELECT
  USING (workspace_id IN (SELECT public.my_workspace_ids()));

CREATE POLICY "Admins can insert brand forms"
  ON brand_forms FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can update brand forms"
  ON brand_forms FOR UPDATE
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can delete brand forms"
  ON brand_forms FOR DELETE
  USING (public.is_workspace_admin(workspace_id));

-- ============================================================================
-- 5. Brand Pages - Generated landing pages
-- ============================================================================
ALTER TABLE brand_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view brand pages in their workspace"
  ON brand_pages FOR SELECT
  USING (workspace_id IN (SELECT public.my_workspace_ids()));

CREATE POLICY "Admins can insert brand pages"
  ON brand_pages FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can update brand pages"
  ON brand_pages FOR UPDATE
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can delete brand pages"
  ON brand_pages FOR DELETE
  USING (public.is_workspace_admin(workspace_id));

-- ============================================================================
-- 6. Sage Forms - Form metadata and configuration
-- ============================================================================
ALTER TABLE sage_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sage forms in their workspace"
  ON sage_forms FOR SELECT
  USING (workspace_id IN (SELECT public.my_workspace_ids()));

CREATE POLICY "Admins can insert sage forms"
  ON sage_forms FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can update sage forms"
  ON sage_forms FOR UPDATE
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can delete sage forms"
  ON sage_forms FOR DELETE
  USING (public.is_workspace_admin(workspace_id));

-- ============================================================================
-- 7. Sage Form Submissions - CRITICAL: Contains customer PII
-- ============================================================================
-- This table contains: names, emails, phone numbers, company info, messages
-- MUST be strictly isolated by workspace
ALTER TABLE sage_form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view form submissions in their workspace"
  ON sage_form_submissions FOR SELECT
  USING (workspace_id IN (SELECT public.my_workspace_ids()));

CREATE POLICY "Members can insert form submissions"
  ON sage_form_submissions FOR INSERT
  WITH CHECK (workspace_id IN (SELECT public.my_workspace_ids()));

CREATE POLICY "Admins can update form submissions"
  ON sage_form_submissions FOR UPDATE
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can delete form submissions"
  ON sage_form_submissions FOR DELETE
  USING (public.is_workspace_admin(workspace_id));
