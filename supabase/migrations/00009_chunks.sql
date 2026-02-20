-- ============================================================
-- Migration 00009: Chunks + Vector Index
-- Each source is split into overlapping text chunks.
-- Each chunk stores a 1536-dimension OpenAI/Claude embedding
-- used for cosine-similarity RAG retrieval.
-- ============================================================

create table chunks (
  id              uuid        primary key default gen_random_uuid(),
  source_id       uuid        not null references sources(id) on delete cascade,
  workspace_id    uuid        not null references workspaces(id) on delete cascade,

  content         text        not null,

  -- 1536 dimensions = text-embedding-3-small / text-embedding-ada-002
  -- Adjust to 3072 for text-embedding-3-large if needed
  embedding       vector(1536),

  -- Position within the source (for ordered reconstruction)
  chunk_index     integer     not null default 0,

  -- Approximate token count of this chunk
  token_count     integer,

  -- Arbitrary metadata: page number, heading path, URL fragment, etc.
  metadata        jsonb       not null default '{}',

  created_at      timestamptz not null default now()
);

-- ============================================================
-- IVFFlat index for approximate nearest-neighbour search
--
-- vector_cosine_ops = cosine similarity (best for text embeddings)
-- lists = 100 is suitable up to ~1M rows.
--   Rule of thumb: lists = sqrt(total_rows)
--   Tune upward (200, 500) as chunk count grows.
--
-- NOTE: The index only helps once the table has enough rows.
--   Postgres falls back to sequential scan for small tables.
-- ============================================================
create index chunks_embedding_cosine_idx
  on chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index chunks_workspace_id_idx on chunks(workspace_id);
create index chunks_source_id_idx    on chunks(source_id);
