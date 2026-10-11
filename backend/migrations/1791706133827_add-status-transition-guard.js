export const up = (pgm) => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION enforce_research_run_status_transition()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.status IS DISTINCT FROM OLD.status
         AND NOT (
           (OLD.status = 'pending'
             AND NEW.status IN ('running', 'cancelled'))
           OR
           (OLD.status = 'running'
             AND NEW.status IN ('completed', 'failed', 'cancelled'))
           OR
           (OLD.status IN ('failed', 'cancelled')
             AND NEW.status = 'pending')
         )
      THEN
        RAISE EXCEPTION
          'INVALID_STATUS_TRANSITION: % -> %',
          OLD.status,
          NEW.status
          USING ERRCODE = '23514';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER research_run_status_transition_guard
    BEFORE UPDATE OF status ON research_runs
    FOR EACH ROW
    EXECUTE FUNCTION enforce_research_run_status_transition();
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS research_run_status_transition_guard
      ON research_runs;

    DROP FUNCTION IF EXISTS enforce_research_run_status_transition();
  `);
};
