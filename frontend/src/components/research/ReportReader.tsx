import { Check, Copy, Download, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import type { ResearchReport, ResearchRun } from "../../types/domain";
import { formatDateTime, parseStructuredContent } from "../../lib/format";

interface Heading {
  id: string;
  text: string;
  level: number;
}

function slugify(text: string, used: Map<string, number>) {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  return count ? `${base}-${count}` : base;
}

function extractHeadings(markdown: string): Heading[] {
  const used = new Map<string, number>();
  return markdown
    .split("\n")
    .map((line) => {
      const match = /^(#{1,3})\s+(.+)$/.exec(line.trim());
      if (!match) return null;
      const text = match[2].replace(/[*_`]/g, "").trim();
      return { id: slugify(text, used), text, level: match[1].length };
    })
    .filter((item): item is Heading => Boolean(item));
}

export function ReportReader({
  report,
  run,
}: {
  report: ResearchReport;
  run?: ResearchRun;
}) {
  const [copied, setCopied] = useState(false);
  const markdown = report.markdown_content ?? "";
  const structured = parseStructuredContent(report.structured_content);
  const headings = useMemo(() => extractHeadings(markdown), [markdown]);
  const headingIds = new Map<string, number>();

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(report.title || "research-report").replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const summary =
    structured && typeof structured.summary === "string" ? structured.summary : null;

  return (
    <div className="report-shell lg:grid lg:grid-cols-[220px_minmax(0,1fr)_220px] lg:gap-8">
      <nav className="no-print mb-6 hidden lg:block">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-fg-muted">
          Contents
        </p>
        <ul className="space-y-1.5">
          {headings.length === 0 ? (
            <li className="text-xs text-fg-muted">No headings found</li>
          ) : (
            headings.map((heading) => (
              <li key={heading.id} className={heading.level === 3 ? "pl-3" : ""}>
                <a
                  href={`#${heading.id}`}
                  className="block text-xs leading-snug text-fg-secondary hover:text-accent"
                >
                  {heading.text}
                </a>
              </li>
            ))
          )}
        </ul>
      </nav>

      <article>
        <header className="mb-8 border-b border-line pb-6">
          <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-fg-muted">
            Scientific review
          </p>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-fg">
            {report.title || run?.question || "Untitled report"}
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-sans text-xs text-fg-secondary">
            <span>Version {report.version}</span>
            <span>{formatDateTime(report.created_at)}</span>
            <span className="font-mono">Run {report.run_id}</span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 font-sans text-sm sm:grid-cols-3">
            {structured?.papers_analyzed != null ? (
              <Meta label="Papers analyzed" value={String(structured.papers_analyzed)} />
            ) : null}
            {structured?.passages_extracted != null ? (
              <Meta label="Passages extracted" value={String(structured.passages_extracted)} />
            ) : null}
            {structured?.claims_count != null ? (
              <Meta label="Claims" value={String(structured.claims_count)} />
            ) : null}
          </dl>
        </header>

        <div className="no-print sticky top-0 z-10 mb-6 flex flex-wrap gap-2 border-b border-line bg-app/95 py-3 backdrop-blur">
          <button
            type="button"
            onClick={() => void copyMarkdown()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-fg-secondary hover:text-fg"
          >
            {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy Markdown"}
          </button>
          <button
            type="button"
            onClick={downloadMarkdown}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-fg-secondary hover:text-fg"
          >
            <Download size={13} />
            Download .md
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-fg-secondary hover:text-fg"
          >
            <Printer size={13} />
            Print / Save PDF
          </button>
        </div>

        {summary ? (
          <section className="mb-8 rounded-xl border border-line bg-elevated p-4 font-sans">
            <p className="text-[11px] uppercase tracking-[0.12em] text-fg-muted">Summary</p>
            <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{summary}</p>
          </section>
        ) : null}

        <div className="report-prose">
          <Markdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize, rehypeHighlight]}
            components={{
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
              h1: ({ children }) => (
                <h1 id={slugify(String(children), headingIds)}>{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 id={slugify(String(children), headingIds)}>{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 id={slugify(String(children), headingIds)}>{children}</h3>
              ),
            }}
          >
            {markdown}
          </Markdown>
        </div>
      </article>

      <aside className="no-print mt-8 hidden lg:block">
        <div className="rounded-xl border border-line bg-elevated p-4 text-sm">
          <p className="text-[11px] uppercase tracking-[0.12em] text-fg-muted">Document</p>
          <p className="mt-3 text-fg-secondary">
            Rendered from API markdown. Structured metadata is shown only when the backend supplies it.
          </p>
          {run?.question ? (
            <p className="mt-4 text-xs leading-relaxed text-fg-muted">{run.question}</p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-fg-muted">{label}</dt>
      <dd className="mt-1 font-mono text-fg">{value}</dd>
    </div>
  );
}
