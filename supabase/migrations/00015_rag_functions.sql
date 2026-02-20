-- ============================================================
-- Migration 00015: RAG Utility Functions
--
-- match_chunks  — primary vector similarity search for RAG
-- match_chunks_multi_source — filter to specific source IDs
-- ============================================================

-- ---------------------------------------------------------------
-- match_chunks
--
-- Called from the API to retrieve the most relevant chunks for
-- a user query.  The API embeds the query first, then calls:
--
--   select * from match_chunks(
--     query_embedding => $1::vector,
--     p_workspace_id  => $2::uuid,
--     match_threshold => 0.75,
--     match_count     => 5
--   );
--
-- Returns rows ordered by descending similarity (closest first).
-- RLS is enforced at the table level; this function is called
-- with the service_role key from the API and therefore bypasses
-- RLS.  Workspace isolation is enforced by the WHERE clause.
-- ---------------------------------------------------------------
create or replace function match_chunks(
  query_embedding vector(1536),
  p_workspace_id  uuid,
  match_threshold float  default 0.70,
  match_count     int    default 5
)
returns table (
  id          uuid,
  source_id   uuid,
  content     text,
  similarity  float,
  metadata    jsonb
)
language sql
stable
as $$
  select
    c.id,
    c.source_id,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity,
    c.metadata
  from chunks c
  where
    c.workspace_id = p_workspace_id
    -- Pre-filter by threshold before sorting (avoids full sort on low matches)
    and 1 - (c.embedding <=> query_embedding) >= match_threshold
  order by c.embedding <=> query_embedding   -- ascending distance = descending similarity
  limit match_count;
$$;


-- ---------------------------------------------------------------
-- match_chunks_multi_source
--
-- Same as match_chunks but restricted to a specific set of
-- source IDs.  Useful when a bot is configured to search only
-- a subset of the workspace knowledge base.
-- ---------------------------------------------------------------
create or replace function match_chunks_multi_source(
  query_embedding vector(1536),
  p_workspace_id  uuid,
  p_source_ids    uuid[],
  match_threshold float  default 0.70,
  match_count     int    default 5
)
returns table (
  id          uuid,
  source_id   uuid,
  content     text,
  similarity  float,
  metadata    jsonb
)
language sql
stable
as $$
  select
    c.id,
    c.source_id,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity,
    c.metadata
  from chunks c
  where
    c.workspace_id = p_workspace_id
    and c.source_id = any(p_source_ids)
    and 1 - (c.embedding <=> query_embedding) >= match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
