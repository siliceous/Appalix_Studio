-- Link sage_forms to a brand profile so forms can be scoped per Brand ID
alter table sage_forms
  add column if not exists brand_profile_id uuid references brand_profiles(id) on delete set null,
  add column if not exists form_type        text not null default 'custom',
  add column if not exists fields_config    jsonb not null default '{}';

-- form_type: 'custom' | 'brand_intake' | 'asset_upload' | 'logo_pack'
-- fields_config: { collect_logo, collect_colors, collect_fonts, collect_photos, collect_social, collect_guidelines }

create index if not exists sage_forms_brand_profile_id_idx on sage_forms(brand_profile_id);
