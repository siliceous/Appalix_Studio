-- Add default_pipeline_id to sage_workspace_settings
-- When set, Sage Auto drops all leads into this specific pipeline.
-- When null, falls back to the oldest pipeline (original behaviour).

alter table sage_workspace_settings
  add column if not exists default_pipeline_id uuid
    references sage_pipelines(id) on delete set null;
