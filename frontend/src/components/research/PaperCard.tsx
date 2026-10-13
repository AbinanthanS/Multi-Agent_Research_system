import { Calendar, ExternalLink, FileText, Users } from "lucide-react";
import { useState } from "react";
import { formatAuthors, paperYear } from "../../lib/format";
import type { ResearchPaper } from "../../types/domain";

export function PaperCard({ paper }: { paper: ResearchPaper }) {
  const [expanded, setExpanded] = useState(false);
  const authors = formatAuthors(paper.authors);
  const year = paperYear(paper);
  const abstract = paper.abstract?.trim() || null;

  return (
    <article className="border-b border-line py-5 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-[15px] leading-snug font-medium text-fg">
          {paper.url ? (
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent"
            >
              {paper.title}
              <ExternalLink size={12} className="ml-1.5 inline opacity-60" />
            </a>
          ) : (
            paper.title
          )}
        </h3>
        {paper.pdf_url ? (
          <a
            href={paper.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-fg-secondary hover:text-fg"
          >
            <FileText size={12} />
            Full PDF available
          </a>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-secondary">
        {year ? (
          <span className="inline-flex items-center gap-1">
            <Calendar size={12} className="text-fg-muted" />
            {year}
          </span>
        ) : (
          <span className="text-fg-muted">Year not provided</span>
        )}
        {authors ? (
          <span className="inline-flex max-w-full items-center gap-1">
            <Users size={12} className="shrink-0 text-fg-muted" />
            <span className="truncate">{authors}</span>
          </span>
        ) : (
          <span className="text-fg-muted">Authors not provided</span>
        )}
        {paper.source ? (
          <span className="font-mono text-[11px] text-fg-muted">{paper.source}</span>
        ) : null}
      </div>
      {abstract ? (
        <div className="mt-3 max-w-3xl">
          <p
            className={`text-sm leading-relaxed text-fg-secondary ${expanded ? "" : "line-clamp-3"}`}
          >
            {abstract}
          </p>
          {abstract.length > 220 ? (
            <button
              type="button"
              className="mt-1 text-xs text-accent hover:underline"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Show less" : "Read full abstract"}
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-fg-muted">No abstract provided.</p>
      )}
    </article>
  );
}
