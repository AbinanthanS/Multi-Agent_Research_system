/**
 * Migration: Database Hardening & Automated Integrity Maintenance.
 *
 * 1. Purges existing orphaned papers and passages not linked to any research run.
 * 2. Installs an automatic orphan cleanup trigger on research_run_papers so that
 *    whenever a paper is unlinked from its last research run, it is automatically
 *    deleted along with its cascading passages.
 * 3. Adds missing performance indexes:
 *    - idx_research_runs_updated_at (for fast updated_at sorting)
 *    - idx_papers_tsv (GIN full-text search index on title + abstract)
 *    - idx_paper_passages_lookup (compound index for fast sequential passage retrieval)
 */

export const up = (pgm) => {
  // 1. Purge legacy orphaned papers (which cascades to paper_passages)
  pgm.sql(`
    DELETE FROM papers
    WHERE id NOT IN (SELECT paper_id FROM research_run_papers);
  `);

  // 2. Automated trigger to prevent future orphaned papers
  pgm.sql(`
    CREATE OR REPLACE FUNCTION cleanup_orphaned_papers_after_unlink()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM research_run_papers WHERE paper_id = OLD.paper_id
      ) THEN
        DELETE FROM papers WHERE id = OLD.paper_id;
      END IF;
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_cleanup_orphaned_papers ON research_run_papers;
    CREATE TRIGGER trg_cleanup_orphaned_papers
    AFTER DELETE ON research_run_papers
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_orphaned_papers_after_unlink();
  `);

  // 3. Add performance indexes
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_research_runs_updated_at
    ON research_runs (updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_papers_tsv
    ON papers USING gin(to_tsvector('english', title || ' ' || coalesce(abstract, '')));

    CREATE INDEX IF NOT EXISTS idx_paper_passages_lookup
    ON paper_passages (paper_id, passage_index);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_cleanup_orphaned_papers ON research_run_papers;
    DROP FUNCTION IF EXISTS cleanup_orphaned_papers_after_unlink();
    DROP INDEX IF EXISTS idx_research_runs_updated_at;
    DROP INDEX IF EXISTS idx_papers_tsv;
    DROP INDEX IF EXISTS idx_paper_passages_lookup;
  `);
};
