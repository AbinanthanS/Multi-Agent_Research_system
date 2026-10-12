/**
 * App.jsx — root component. Simple client-side routing via state.
 * Views: 'dashboard' → 'run-detail'
 */
import { useState } from 'react';
import { Dashboard }   from './pages/Dashboard';
import { RunDetail }   from './pages/RunDetail';
import { ToastContainer } from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import './index.css';

export default function App() {
  const [view, setView]         = useState('dashboard');
  const [selectedRun, setSelectedRun] = useState(null);
  const { toasts, toast, removeToast } = useToast();

  function openRun(run) {
    setSelectedRun(run);
    setView('run-detail');
  }

  function backToDashboard() {
    setSelectedRun(null);
    setView('dashboard');
  }

  return (
    <>
      {view === 'dashboard' && (
        <Dashboard onSelectRun={openRun} toast={toast} />
      )}
      {view === 'run-detail' && selectedRun && (
        <RunDetail
          initialRun={selectedRun}
          onBack={backToDashboard}
          toast={toast}
        />
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
