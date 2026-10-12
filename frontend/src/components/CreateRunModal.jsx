/**
 * CreateRunModal.jsx — modal dialog to create a new research run.
 * Fields: topic (required), description, max_papers.
 */
import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

const DEFAULT = { topic: '', description: '', max_papers: 10 };

export function CreateRunModal({ onClose, onCreate }) {
  const [form, setForm]     = useState(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.topic.trim()) {
      setError('Research topic is required.');
      return;
    }
    if (form.topic.trim().length < 10) {
      setError('Research topic / question must be at least 10 characters.');
      return;
    }
    setLoading(true);
    try {
      await onCreate({ ...form, max_papers: Number(form.max_papers) });
      onClose();
    } catch (err) {
      setError(err.message ?? 'Failed to create run.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-run-title"
    >
      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--accent-glow)',
              border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={18} color="var(--accent-light)" />
            </div>
            <h2 id="create-run-title" style={{ fontSize: '1.0625rem', fontWeight: 600 }}>
              New Research Run
            </h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="run-topic">Research Topic *</label>
              <input
                id="run-topic"
                className="input"
                placeholder="e.g. Transformer architectures in NLP"
                value={form.topic}
                onChange={(e) => set('topic', e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="run-desc">Description</label>
              <textarea
                id="run-desc"
                className="textarea"
                placeholder="What specific aspects or questions should the research address?"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="run-max-papers">
                Max Papers to Analyse
              </label>
              <input
                id="run-max-papers"
                className="input"
                type="number"
                min={1}
                max={50}
                value={form.max_papers}
                onChange={(e) => set('max_papers', e.target.value)}
                style={{ maxWidth: 120 }}
              />
              <span className="form-hint">The AI pipeline will process up to this many papers.</span>
            </div>

            {error && (
              <p style={{ color: 'var(--status-failed)', fontSize: '0.875rem' }}>{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : <Sparkles size={15} />}
              {loading ? 'Creating…' : 'Create Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
