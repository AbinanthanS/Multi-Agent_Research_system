/**
 * RunDetail.jsx — detailed view for a single research run.
 * Provides: live status polling, discover/execute actions, papers, report + claims tabs.
 */
import { useState, useCallback, useEffect } from 'react';
import {
  ArrowLeft, Play, Search, FileText, ShieldCheck,
  Loader2, RefreshCw, AlertTriangle, BookOpen,
} from 'lucide-react';
import { api } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import { ReportPanel } from '../components/ReportPanel';
import { ClaimsPanel } from '../components/ClaimsPanel';
import { PapersPanel } from '../components/PapersPanel';
import { usePolling } from '../hooks/usePolling';

const TERMINAL = new Set(['completed', 'failed']);
const TABS = [
  { id: 'papers', label: 'Papers',  icon: <BookOpen    size={14} /> },
  { id: 'report', label: 'Report',  icon: <FileText    size={14} /> },
  { id: 'claims', label: 'Claims',  icon: <ShieldCheck size={14} /> },
];

function ActionButton({ id, icon, label, loading, disabled, onClick, variant = 'secondary' }) {
  return (
    <button
      id={id}
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={loading || disabled}
    >
      {loading ? <Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> : icon}
      {label}
    </button>
  );
}

function MetaRow({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: typeof value === 'string' && value?.match?.(/^\d/) ? 'var(--font-mono)' : undefined }}>
        {value || '—'}
      </span>
    </div>
  );
}

export function RunDetail({ initialRun, onBack, toast }) {
  const [run, setRun]             = useState(initialRun);
  const [tab, setTab]             = useState(initialRun.status === 'completed' ? 'report' : 'papers');
  const [papers, setPapers]       = useState(null);
  const [report, setReport]       = useState(null);
  const [claims, setClaims]       = useState(null);
  const [discovering, setDisc]    = useState(false);
  const [executing, setExec]      = useState(false);
  const [loadingData, setLoading] = useState(false);

  const isTerminal = TERMINAL.has(run.status);
  const isRunning  = run.status === 'running';

  /* ── Poll run status while it's active ── */
  const pollRun = useCallback(async () => {
    try {
      const fresh = await api.getRun(run.id);
      setRun(fresh?.run ?? fresh);
    } catch { /* ignore transient errors */ }
  }, [run.id]);

  usePolling(pollRun, 4000, isRunning || run.status === 'pending');

  /* ── Load tab data ── */
  const loadTabData = useCallback(async (tabId) => {
    if (tabId === 'papers') {
      setLoading(true);
      try {
        const data = await api.getPapers(run.id);
        setPapers(data);
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    } else if (tabId === 'report' && run.status === 'completed') {
      setLoading(true);
      try {
        setReport(await api.getReport(run.id));
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    } else if (tabId === 'claims' && run.status === 'completed') {
      setLoading(true);
      try {
        const data = await api.getClaims(run.id);
        setClaims(data?.claims ?? data ?? []);
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    }
  }, [run.id, run.status, toast]);

  // Initial load of current tab
  useEffect(() => {
    loadTabData(tab);
  }, [loadTabData, tab]);

  function handleTabChange(tabId) {
    setTab(tabId);
  }

  /* ── Actions ── */
  async function handleDiscover() {
    setDisc(true);
    try {
      await api.discoverPapers(run.id);
      const discovered = await api.getPapers(run.id);
      setPapers(discovered);
      setTab('papers');
      toast(`Discovered ${discovered.length} papers!`, 'success');
      pollRun();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDisc(false);
    }
  }

  async function handleExecute() {
    setExec(true);
    try {
      setRun((prev) => ({ ...prev, status: 'running' }));
      const result = await api.executeRun(run.id);
      toast('AI pipeline completed! Report and claims generated.', 'success');
      // Execute endpoint returns completed run data directly
      if (result?.data?.status === 'completed' || result?.status === 'success') {
        setRun((prev) => ({ ...prev, status: 'completed' }));
        setTab('report');
        try {
          const rep = await api.getReport(run.id);
          setReport(rep);
        } catch { /* ignore */ }
      }
      pollRun();
    } catch (err) {
      toast(err.message, 'error');
      pollRun();
    } finally {
      setExec(false);
    }
  }

  async function handleRefreshData() {
    setPapers(null);
    setReport(null);
    setClaims(null);
    await loadTabData(tab);
  }

  const fmtDate = (s) => s ? new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(s)) : '—';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>
      {/* Back */}
      <button
        id="back-to-dashboard"
        className="btn btn-ghost"
        onClick={onBack}
        style={{ marginBottom: 'var(--space-6)', paddingLeft: 0 }}
      >
        <ArrowLeft size={16} />
        All Runs
      </button>

      {/* Hero card */}
      <div className="card" style={{
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-6)',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(56,189,248,0.04) 100%)',
      }}>
        <div className="flex items-center justify-between gap-4" style={{ flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
          <div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: 4, letterSpacing: '-0.01em' }}>
              {run.topic || run.question}
            </h1>
            {run.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: 600 }}>
                {run.description}
              </p>
            )}
          </div>
          <StatusBadge status={run.status} />
        </div>

        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-5)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)' }}>
          <MetaRow label="Run ID"     value={run.id} />
          <MetaRow label="Created"    value={fmtDate(run.created_at)} />
          <MetaRow label="Max Papers" value={run.max_papers || run.filters?.maxPapers || 20} />
          <MetaRow label="Status"     value={run.status} />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          {!isTerminal && run.status !== 'running' && (
            <ActionButton
              id="discover-papers-btn"
              icon={<Search size={15} />}
              label={discovering ? 'Discovering…' : 'Discover Papers'}
              loading={discovering}
              onClick={handleDiscover}
            />
          )}
          {(run.status === 'pending' || run.status === 'failed' || run.status === 'papers_discovered' || (papers && papers.length > 0)) && run.status !== 'running' && run.status !== 'completed' && (
            <ActionButton
              id="execute-run-btn"
              icon={<Play size={15} />}
              label={executing ? 'Launching…' : run.status === 'failed' ? 'Retry AI Pipeline' : 'Execute AI Pipeline'}
              loading={executing}
              onClick={handleExecute}
              variant="primary"
            />
          )}
          {isRunning && (
            <div className="flex items-center gap-2" style={{ color: 'var(--status-running)', fontSize: '0.875rem' }}>
              <Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} />
              Pipeline is running — polling every 4 s…
            </div>
          )}
          {run.status === 'failed' && (
            <div className="flex items-center gap-2" style={{ color: 'var(--status-failed)', fontSize: '0.875rem' }}>
              <AlertTriangle size={15} />
              Run failed. Check service logs.
            </div>
          )}
          {isTerminal && (
            <button
              id="refresh-data-btn"
              className="btn btn-secondary btn-sm"
              onClick={handleRefreshData}
            >
              <RefreshCw size={14} />
              Refresh data
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 'var(--space-5)' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => handleTabChange(t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {loadingData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : tab === 'papers' ? (
        <PapersPanel
          papers={papers || []}
          onDiscover={handleDiscover}
          discovering={discovering}
        />
      ) : tab === 'report' ? (
        run.status === 'completed' ? (
          <ReportPanel report={report} />
        ) : (
          <div className="empty-state card" style={{ padding: 'var(--space-12)' }}>
            <div className="empty-state-icon">
              <FileText size={28} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Report not generated yet
            </h3>
            <p>
              {run.status === 'running'
                ? 'The AI synthesis agent is currently writing the report. It will appear here once complete.'
                : 'Discover papers and click "Execute AI Pipeline" to produce the synthesis report.'}
            </p>
          </div>
        )
      ) : (
        run.status === 'completed' ? (
          <ClaimsPanel claims={claims} />
        ) : (
          <div className="empty-state card" style={{ padding: 'var(--space-12)' }}>
            <div className="empty-state-icon">
              <ShieldCheck size={28} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Claims & Evidence not extracted yet
            </h3>
            <p>Run the AI pipeline to extract and fact-check claims from literature.</p>
          </div>
        )
      )}
    </div>
  );
}
