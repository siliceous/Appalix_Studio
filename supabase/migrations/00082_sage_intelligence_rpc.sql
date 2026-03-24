-- Semantic similarity search over Sage CRM embeddings
CREATE OR REPLACE FUNCTION match_sage_embeddings(
  query_embedding vector(1536),
  p_workspace_id  uuid,
  p_entity_types  text[] DEFAULT NULL,
  match_threshold float DEFAULT 0.5,
  match_count     int   DEFAULT 10
)
RETURNS TABLE (
  id          uuid,
  entity_type text,
  entity_id   uuid,
  content     text,
  similarity  float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    se.id,
    se.entity_type,
    se.entity_id,
    se.content,
    1 - (se.embedding <=> query_embedding) AS similarity
  FROM sage_embeddings se
  WHERE se.workspace_id = p_workspace_id
    AND (p_entity_types IS NULL OR se.entity_type = ANY(p_entity_types))
    AND 1 - (se.embedding <=> query_embedding) > match_threshold
  ORDER BY se.embedding <=> query_embedding
  LIMIT match_count;
$$;
