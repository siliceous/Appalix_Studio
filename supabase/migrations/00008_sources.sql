-- ============================================================
-- Migration 00008: RAG Sources
-- A source is a document or data feed that gets chunked and
-- embedded into pgvector for retrieval-augmented generation.
-- ============================================================

create table sources (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references workspaces(id) on delete cascade,

  -- Source type drives how the ingestion pipeline processes it
  type            text        not null check (type in (
                                'url',          -- single web page
                                'sitemap',      -- crawl all URLs in sitemap.xml
                                'file',         -- uploaded file (PDF, DOCX, TXT, CSV)
                                'text',         -- raw pasted text
                                'notion',       -- Notion page/database
                                'confluence'    -- Confluence space/page
                              )),

  name            text        not null,
  description     text,

  -- Location of the source content
  url             text,       -- for url / sitemap / notion / confluence types
  file_path       text,       -- Supabase Storage object path for file type

  -- Processing lifecycle
  status          text        not null default 'pending'
                              check (status in (
                                'pending',      -- queued, not yet started
                                'processing',   -- ingestion job running
                                'ready',        -- chunks created and indexed
                                'failed',       -- ingestion error
                                'outdated'      -- source changed, re-sync needed
                              )),

  chunk_count     integer,
  error_message   text,
  last_synced_at  timestamptz,

  -- Arbitrary platform-specific metadata (e.g. Notion page ID, sitemap depth)
  metadata        jsonb       not null default '{}',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger sources_updated_at
  before update on sources
  for each row execute function update_updated_at_column();

create index sources_workspace_id_idx on sources(workspace_id);
create index sources_status_idx       on sources(status);
-- GIN index enables fast text search on source names
create index sources_name_trgm_idx
  on sources using gin (name gin_trgm_ops);
