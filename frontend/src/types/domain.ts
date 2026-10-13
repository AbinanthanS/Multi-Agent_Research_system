export type ResearchRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface ResearchFilters {
  maxPapers?: number;
  domain?: string;
  yearFrom?: number;
  yearTo?: number;
}

export interface ResearchRun {
  id: string;
  question: string;
  status: ResearchRunStatus;
  filters: ResearchFilters | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Pagination {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export interface ResearchRunList {
  items: ResearchRun[];
  pagination: Pagination;
}

export interface ResearchPaper {
  id: string;
  title: string;
  abstract: string | null;
  authors: unknown;
  published_year: number | null;
  url: string | null;
  pdf_url: string | null;
  source?: string;
  source_id?: string | null;
  doi?: string | null;
}

export interface ProviderDiscoveryResult {
  status: "succeeded" | "failed" | string;
  count: number;
}

export interface DiscoveryWarning {
  provider: string;
  message: string;
}

export interface PaperDiscoveryResult {
  runId: string;
  discoveredCount: number;
  savedCount: number;
  providers: {
    arxiv?: ProviderDiscoveryResult;
    semanticScholar?: ProviderDiscoveryResult;
  };
  warnings: DiscoveryWarning[];
  papers?: ResearchPaper[];
}

export interface PapersResponse {
  runId: string;
  count: number;
  papers: ResearchPaper[];
}

export type SupportType = "supporting" | "contradicting" | "contextual" | string;

export interface EvidencePassage {
  passage_id: string | null;
  support_type: SupportType;
  explanation: string | null;
  passage_text: string | null;
  page_number: number | null;
  section: string | null;
}

export interface ResearchClaim {
  id: string;
  claim_text: string;
  claim_type: string | null;
  confidence: number | null;
  created_at: string;
  evidence: EvidencePassage[];
}

export interface ClaimsResponse {
  runId: string;
  claims: ResearchClaim[];
}

export interface StructuredReportContent {
  summary?: string;
  papers_analyzed?: number;
  passages_extracted?: number;
  claims_count?: number;
  [key: string]: unknown;
}

export interface ResearchReport {
  id: string;
  run_id: string;
  version: number;
  title: string | null;
  markdown_content: string | null;
  structured_content: StructuredReportContent | string | null;
  created_at: string;
}

export interface ReportResponse {
  runId: string;
  report: ResearchReport | null;
}

export interface ExecuteResult {
  runId: string;
  status: string;
  report?: ResearchReport | null;
  claims?: ResearchClaim[];
}

export interface CreateResearchRunInput {
  question: string;
  filters?: {
    maxPapers?: number;
    domain?: string;
  };
}

export interface HealthStatus {
  status: string;
  service?: string;
  database?: string;
}
