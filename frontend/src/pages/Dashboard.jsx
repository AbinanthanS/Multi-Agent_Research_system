/**
 * Dashboard.jsx — main listing view of all research runs.
 */
import { useState, useEffect, useCallback } from 'react';
import { Plus, Brain, RefreshCw, Search } from 'lucide-react';
import { api } from '../api';
import { RunCard } from '../components/RunCard';
import { CreateRunModal } from '../components/CreateRunModal';

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 'var(--space-5)' }}>
      <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 6 }} />
      <div className="skeleton" style={{ height: 14, width: '40%' }} />
    </div>
  );
}

export function Dashboard({ onSelectRun, toast }) {
  const [runs, setRuns]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery]       = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await api.listRuns();
      setRuns(Array.isArray(data) ? data : []);
    } catch (err) {
      toast(err.message, 'error');
      setRuns([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(body) {
    const created = await api.createRun(body);
    toast(`Research run "${body.topic || body.question}" created!`, 'success');
    await load(true);
    return created;
  }

  const safeRuns = Array.isArray(runs) ? runs : [];
  const filtered = safeRuns.filter((r) =>
    (r.topic || r.question || '')?.toLowerCase().includes(query.toLowerCase()) ||
    (r.description || '')?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>
      {/* Page header */}
      <header style={{ marginBottom: 'var(--space-8)' }}>
        <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-2)' }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--accent-primary), #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px var(--accent-glow)',
          }}>
            <Brain size={26} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              ResearchOS
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Multi-Agent AI Research System
            </p>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-6)' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }} />
          <input
            id="run-search"
            className="input"
            placeholder="Search runs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>

        <button
          id="refresh-runs-btn"
          className="btn btn-secondary btn-icon"
          onClick={() => load(true)}
          disabled={refreshing}
          aria-label="Refresh list"
          title="Refresh"
        >
          <RefreshCw size={16} style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }} />
        </button>

        <button
          id="create-run-btn"
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          <Plus size={16} />
          New Run
        </button>
      </div>

      {/* Run list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Brain size={28} />
          </div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {safeRuns.length === 0 ? 'No research runs yet' : 'No matches found'}
          </h2>
          <p style={{ maxWidth: 320 }}>
            {safeRuns.length === 0
              ? 'Create your first run to start analysing academic papers with AI agents.'
              : 'Try a different search term.'}
          </p>
          {safeRuns.length === 0 && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} />
              Create your first run
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
            gap: 'var(--space-4)',
            animation: 'fadeSlideIn var(--trans-slow)',
          }}
        >
          {filtered.map((run) => (
            <RunCard key={run.id} run={run} onClick={() => onSelectRun(run)} />
          ))}
        </div>
      )}

      {/* Stats footer */}
      {!loading && safeRuns.length > 0 && (
        <p style={{ marginTop: 'var(--space-6)', color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center' }}>
          {safeRuns.length} run{safeRuns.length !== 1 ? 's' : ''} total
          {' · '}
          {safeRuns.filter((r) => r.status === 'completed').length} completed
          {' · '}
          {safeRuns.filter((r) => r.status === 'running').length} running
        </p>
      )}

      {showModal && (
        <CreateRunModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
