/**
 * PapersPanel.jsx — displays candidate papers discovered from ArXiv & Semantic Scholar.
 */
import { useState } from 'react';
import { BookOpen, ExternalLink, FileDown, Search, Users, Calendar } from 'lucide-react';

export function PapersPanel({ papers = [], onDiscover, discovering }) {
  const [filterQuery, setFilterQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const safePapers = Array.isArray(papers) ? papers : [];
  const filtered = safePapers.filter((p) => {
    const q = filterQuery.toLowerCase();
    const title = (p.title || '').toLowerCase();
    const abstract = (p.abstract || '').toLowerCase();
    const authors = Array.isArray(p.authors) ? p.authors.join(' ').toLowerCase() : '';
    return title.includes(q) || abstract.includes(q) || authors.includes(q);
  });

  if (safePapers.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <BookOpen size={28} />
        </div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          No papers discovered yet
        </h3>
        <p style={{ maxWidth: 420 }}>
          Click "Discover Papers" above to search academic literature across ArXiv and Semantic Scholar for relevant papers.
        </p>
        {onDiscover && (
          <button
            className="btn btn-primary"
            onClick={onDiscover}
            disabled={discovering}
            style={{ marginTop: 'var(--space-2)' }}
          >
            <BookOpen size={16} />
            {discovering ? 'Discovering papers…' : 'Discover Papers Now'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Search & Stats Bar */}
      <div className="flex items-center justify-between gap-3" style={{ flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={14} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }} />
          <input
            className="input"
            placeholder="Search discovered papers by title, author, or keyword…"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            style={{ paddingLeft: 34, fontSize: '0.8125rem' }}
          />
        </div>

        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Showing {filtered.length} of {safePapers.length} paper{safePapers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Papers List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {filtered.map((paper, idx) => {
          const isExpanded = expandedId === (paper.id || idx);
          const authorsText = Array.isArray(paper.authors)
            ? paper.authors.join(', ')
            : paper.authors || 'Unknown Authors';

          return (
            <article
              key={paper.id || idx}
              className="card"
              style={{
                padding: 'var(--space-5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              {/* Title & External Link */}
              <div className="flex items-start justify-between gap-3">
                <h4 style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.4, margin: 0, color: 'var(--text-primary)' }}>
                  {paper.url ? (
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5"
                      style={{ color: 'inherit', textDecoration: 'none' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-light)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
                    >
                      <span>{paper.title}</span>
                      <ExternalLink size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                    </a>
                  ) : (
                    paper.title
                  )}
                </h4>

                {paper.pdf_url && (
                  <a
                    href={paper.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                    style={{ flexShrink: 0, gap: 4, padding: '4px 8px', fontSize: '0.75rem' }}
                    title="Open PDF"
                  >
                    <FileDown size={13} />
                    <span>PDF</span>
                  </a>
                )}
              </div>

              {/* Metadata row */}
              <div className="flex items-center gap-4" style={{ flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {paper.published_year && (
                  <span className="flex items-center gap-1">
                    <Calendar size={13} color="var(--text-muted)" />
                    <span>{paper.published_year}</span>
                  </span>
                )}
                {authorsText && (
                  <span className="flex items-center gap-1">
                    <Users size={13} color="var(--text-muted)" />
                    <span className="truncate" style={{ maxWidth: 450 }}>{authorsText}</span>
                  </span>
                )}
              </div>

              {/* Abstract */}
              {paper.abstract && (
                <div style={{ marginTop: 2 }}>
                  <p style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                    display: isExpanded ? 'block' : '-webkit-box',
                    WebkitLineClamp: isExpanded ? 'unset' : 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {paper.abstract}
                  </p>
                  {paper.abstract.length > 150 && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setExpandedId(isExpanded ? null : (paper.id || idx))}
                      style={{ padding: '2px 0', fontSize: '0.75rem', color: 'var(--accent-light)', height: 'auto' }}
                    >
                      {isExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
