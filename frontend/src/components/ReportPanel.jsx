/**
 * ReportPanel.jsx — renders the AI-generated markdown research report.
 */
import { useState } from 'react';
import { marked } from 'marked';
import { FileText, Copy, CheckCheck } from 'lucide-react';

// Configure marked for safety and quality
marked.setOptions({ gfm: true, breaks: true });

export function ReportPanel({ report }) {
  const [copied, setCopied] = useState(false);

  async function copyMarkdown() {
    if (!report?.content) return;
    await navigator.clipboard.writeText(report.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!report?.content) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <FileText size={28} />
        </div>
        <p>Report not available yet. Execute the run to generate one.</p>
      </div>
    );
  }

  const html = marked.parse(report.content);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between" style={{
        padding: 'var(--space-3) var(--space-4)',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
      }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          AI-generated synthesis report
        </span>
        <button className="btn btn-ghost btn-sm" onClick={copyMarkdown} id="copy-report-btn">
          {copied ? <CheckCheck size={14} color="var(--status-completed)" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy Markdown'}
        </button>
      </div>

      {/* Content */}
      <div
        className="prose card"
        style={{ padding: 'var(--space-8)' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
