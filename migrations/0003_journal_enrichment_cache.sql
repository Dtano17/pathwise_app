CREATE TABLE IF NOT EXISTS journal_enrichment_cache (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(512) NOT NULL UNIQUE,
  enriched_data JSONB NOT NULL,
  image_url TEXT,
  verified BOOLEAN DEFAULT false,
  enrichment_source VARCHAR(50),
  is_coming_soon BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS journal_enrichment_cache_key_idx ON journal_enrichment_cache (cache_key);
