
export const up = (pgm) => {
  pgm.createTable("research_runs", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    question: { type: "text", notNull: true },
    status: {
      type: "text",
      notNull: true,
      default: "pending",
      check: "status IN ('pending', 'running', 'completed', 'failed', 'cancelled')",
    },
    filters: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    started_at: { type: "timestamptz" },
    completed_at: { type: "timestamptz" },
    error_message: { type: "text" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createTable("papers", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    source: { type: "text", notNull: true },
    source_id: { type: "text" },
    doi: { type: "text" },
    title: { type: "text", notNull: true },
    abstract: { type: "text" },
    authors: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'[]'::jsonb"),
    },
    published_year: {
      type: "integer",
      check: "published_year IS NULL OR published_year BETWEEN 1000 AND 9999",
    },
    url: { type: "text" },
    pdf_url: { type: "text" },
    metadata: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.addConstraint("papers", "papers_source_source_id_unique", {
    unique: ["source", "source_id"],
  });
  pgm.addConstraint("papers", "papers_doi_unique", {
    unique: ["doi"],
  });

  pgm.createTable("research_run_papers", {
    run_id: {
      type: "uuid",
      notNull: true,
      references: '"research_runs"',
      onDelete: "CASCADE",
    },
    paper_id: {
      type: "uuid",
      notNull: true,
      references: '"papers"',
      onDelete: "CASCADE",
    },
    relevance_score: {
      type: "numeric(5,4)",
      check: "relevance_score IS NULL OR relevance_score BETWEEN 0 AND 1",
    },
    discovery_source: { type: "text" },
    added_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });
  pgm.addConstraint("research_run_papers", "research_run_papers_pk", {
    primaryKey: ["run_id", "paper_id"],
  });

  pgm.createTable("paper_passages", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    paper_id: {
      type: "uuid",
      notNull: true,
      references: '"papers"',
      onDelete: "CASCADE",
    },
    passage_index: { type: "integer", notNull: true },
    text: { type: "text", notNull: true },
    page_number: {
      type: "integer",
      check: "page_number IS NULL OR page_number > 0",
    },
    section: { type: "text" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });
  pgm.addConstraint("paper_passages", "paper_passages_paper_index_unique", {
    unique: ["paper_id", "passage_index"],
  });

  pgm.createTable("claims", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    run_id: {
      type: "uuid",
      notNull: true,
      references: '"research_runs"',
      onDelete: "CASCADE",
    },
    claim_text: { type: "text", notNull: true },
    claim_type: { type: "text" },
    confidence: {
      type: "numeric(5,4)",
      check: "confidence IS NULL OR confidence BETWEEN 0 AND 1",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createTable("claim_evidence", {
    claim_id: {
      type: "uuid",
      notNull: true,
      references: '"claims"',
      onDelete: "CASCADE",
    },
    passage_id: {
      type: "uuid",
      notNull: true,
      references: '"paper_passages"',
      onDelete: "CASCADE",
    },
    support_type: {
      type: "text",
      notNull: true,
      check: "support_type IN ('supporting', 'contradicting', 'contextual')",
    },
    explanation: { type: "text" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });
  pgm.addConstraint("claim_evidence", "claim_evidence_pk", {
    primaryKey: ["claim_id", "passage_id"],
  });

  pgm.createTable("reports", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    run_id: {
      type: "uuid",
      notNull: true,
      references: '"research_runs"',
      onDelete: "CASCADE",
    },
    version: { type: "integer", notNull: true, default: 1 },
    title: { type: "text", notNull: true },
    markdown_content: { type: "text", notNull: true },
    structured_content: { type: "jsonb" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });
  pgm.addConstraint("reports", "reports_run_version_unique", {
    unique: ["run_id", "version"],
  });

  pgm.createIndex("research_runs", "created_at");
  pgm.createIndex("research_runs", "status");
  pgm.createIndex("papers", "published_year");
  pgm.createIndex("research_run_papers", "paper_id");
  pgm.createIndex("paper_passages", "paper_id");
  pgm.createIndex("claims", "run_id");
  pgm.createIndex("claim_evidence", "passage_id");
  pgm.createIndex("reports", "run_id");
};

export const down = (pgm) => {
  pgm.dropTable("reports");
  pgm.dropTable("claim_evidence");
  pgm.dropTable("claims");
  pgm.dropTable("paper_passages");
  pgm.dropTable("research_run_papers");
  pgm.dropTable("papers");
  pgm.dropTable("research_runs");
};
