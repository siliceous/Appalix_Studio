-- Add deliverables column to sage_projects
alter table sage_projects add column if not exists deliverables text;
