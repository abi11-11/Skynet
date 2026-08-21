-- Migration: 0016_rag_knowledge_hub.sql
-- Creates the geo-scoped RAG knowledge base for the AI Agronomist feature.
-- Requires: pgvector, postgis (enabled in prior migrations or Supabase dashboard)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- Core knowledge chunks table (one row per unique piece of content)
-- content_hash ensures deduplication: same text from 100 farmers = 1 row
-- ---------------------------------------------------------------------------
CREATE TABLE knowledge_chunks (
  id           bigserial PRIMARY KEY,
  content      text NOT NULL,
  embedding    vector(384),                        -- MiniLM / Gemini embedding dim
  content_hash text UNIQUE NOT NULL,              -- SHA-256 of content for dedup
  scope        text NOT NULL CHECK (scope IN ('global', 'state', 'district', 'farm')),
  state        text,                              -- e.g. 'Tamil Nadu'
  district     text,                             -- e.g. 'Coimbatore'
  location     geography(POINT, 4326),           -- PostGIS point for geo queries
  radius_km    int DEFAULT 50,                   -- how far this info is relevant
  is_public    boolean NOT NULL DEFAULT false,   -- false = farm-private only
  source_type  text NOT NULL DEFAULT 'customer_upload'
    CHECK (source_type IN ('skynet_curated', 'tnau', 'icar', 'imd', 'customer_upload')),
  crop_tags    text[] DEFAULT '{}',              -- e.g. ['rice', 'cotton']
  title        text,                             -- human-readable doc title
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Many-to-one link: multiple farms can reference the same deduplicated chunk
-- ---------------------------------------------------------------------------
CREATE TABLE farm_knowledge_links (
  id          bigserial PRIMARY KEY,
  farm_id     uuid NOT NULL REFERENCES farm_plots(id) ON DELETE CASCADE,
  chunk_id    bigint NOT NULL REFERENCES knowledge_chunks(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(farm_id, chunk_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- HNSW vector index for fast approximate nearest-neighbour search
CREATE INDEX knowledge_chunks_embedding_idx
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

-- GiST index for fast PostGIS radius queries
CREATE INDEX knowledge_chunks_location_idx
  ON knowledge_chunks USING GIST (location);

-- Covering index for scope-based filtering
CREATE INDEX knowledge_chunks_scope_state_idx
  ON knowledge_chunks (scope, state);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks FORCE ROW LEVEL SECURITY;
ALTER TABLE farm_knowledge_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_knowledge_links FORCE ROW LEVEL SECURITY;

-- Anyone can read public chunks (geo filtering is handled in the query function)
CREATE POLICY knowledge_chunks_public_read ON knowledge_chunks
  FOR SELECT USING (is_public = true);

-- Authenticated users can insert new chunks
CREATE POLICY knowledge_chunks_authenticated_insert ON knowledge_chunks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can read links for farms they have access to
CREATE POLICY farm_knowledge_links_read ON farm_knowledge_links
  FOR SELECT USING (public.can_access_plot(farm_id));

-- Users can insert links for farms they have access to
CREATE POLICY farm_knowledge_links_insert ON farm_knowledge_links
  FOR INSERT WITH CHECK (public.can_access_plot(farm_id));

-- ---------------------------------------------------------------------------
-- Geo-scoped retrieval function
-- Called at query time with the user's farm context to fetch relevant chunks
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding  vector(384),
  p_farm_id        uuid,
  p_farm_lat       float,
  p_farm_lng       float,
  p_farm_state     text,
  p_match_count    int DEFAULT 10
)
RETURNS TABLE (
  chunk_id    bigint,
  content     text,
  title       text,
  source_type text,
  scope       text,
  similarity  float
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    kc.id        AS chunk_id,
    kc.content,
    kc.title,
    kc.source_type,
    kc.scope,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE
    -- Tier 4: Farm's own private documents (via link table)
    kc.id IN (
      SELECT fkl.chunk_id
      FROM farm_knowledge_links fkl
      WHERE fkl.farm_id = p_farm_id
    )
    OR (
      kc.is_public = true AND (
        -- Tier 1: Global knowledge (applies to all farms everywhere)
        kc.scope = 'global'
        -- Tier 2: State-level knowledge (same state only)
        OR (kc.scope = 'state' AND kc.state = p_farm_state)
        -- Tier 3: District / geo-radius knowledge (PostGIS sphere check)
        OR (
          kc.scope IN ('district', 'farm')
          AND kc.location IS NOT NULL
          AND ST_DWithin(
            kc.location,
            ST_SetSRID(ST_MakePoint(p_farm_lng, p_farm_lat), 4326)::geography,
            kc.radius_km * 1000  -- convert km to metres
          )
        )
      )
    )
  ORDER BY similarity DESC
  LIMIT p_match_count;
$$;

-- Explicitly grant permissions to API roles because auto_expose_new_tables defaults to false
GRANT ALL ON TABLE public.knowledge_chunks TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE public.farm_knowledge_links TO postgres, service_role, authenticated, anon;
GRANT ALL ON SEQUENCE public.knowledge_chunks_id_seq TO postgres, service_role, authenticated, anon;
GRANT ALL ON SEQUENCE public.farm_knowledge_links_id_seq TO postgres, service_role, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks TO postgres, service_role, authenticated, anon;
