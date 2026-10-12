/**
 * Migration: Enable pgvector and add embedding column to paper_passages.
 *
 * Uses the pgvector Postgres extension (pre-installed on Neon) to store
 * 768-dimensional float vectors from Gemini text-embedding-004.
 * A cosine similarity index (HNSW) is created for fast approximate nearest-
 * neighbour search during RAG retrieval.
 *
 * Note: pgm.sql() is used for DDL that the node-pg-migrate DSL doesn't natively
 * support (CREATE EXTENSION, vector type, HNSW index syntax).
 */

export const up = (pgm) => {
  // Enable the pgvector extension (Neon has it pre-installed)
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS vector`);

  // Add embedding column: 768 dims = text-embedding-004 output dimension
  pgm.sql(`
    ALTER TABLE paper_passages
    ADD COLUMN IF NOT EXISTS embedding vector(768)
  `);

  // HNSW index for fast cosine similarity search
  // Partial index skips NULL rows (saves space when embeddings are optional)
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_paper_passages_embedding_hnsw
    ON paper_passages
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
    WHERE embedding IS NOT NULL
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_paper_passages_embedding_hnsw`);
  pgm.sql(`ALTER TABLE paper_passages DROP COLUMN IF EXISTS embedding`);
  // Leave the vector extension in place — other tables may use it
};
