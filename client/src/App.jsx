import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AgentDirectory from './components/AgentDirectory';
import DataEntryForm from './components/DataEntryForm';
import LedgerStatements from './components/LedgerStatements';
import WhatsAppTagadaModal from './components/WhatsAppTagadaModal';
import ToastNotification from './components/ToastNotification';
import ProtectedRoute from './components/ProtectedRoute';

// Reports
import ReceivablesReport from './components/reports/ReceivablesReport';
import AdvanceDepositsReport from './components/reports/AdvanceDepositsReport';
import KsaExposureReport from './components/reports/KsaExposureReport';
import DailyFlowReport from './components/reports/DailyFlowReport';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('traveledger_auth');
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  });

  const [agents, setAgents] = useState([]);
  const [selectedAgentForLedger, setSelectedAgentForLedger] = useState(null);
  const [selectedAgentForTagada, setSelectedAgentForTagada] = useState(null);
  const [isTagadaModalOpen, setIsTagadaModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Edit Voucher State
  const [editingVoucher, setEditingVoucher] = useState(null);

  // Feature 5: Persistent Multi-Theme Switcher (arafa-teal, midnight-onyx, executive-navy)
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('traveledger_theme') || 'arafa-teal';
    // Apply dark class immediately on load (before first render) to prevent flash
    if (saved === 'midnight-onyx') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('data-theme', saved);
    return saved;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('traveledger_theme', currentTheme);
    // Toggle Tailwind dark mode class — 'midnight-onyx' is the dark theme
    if (currentTheme === 'midnight-onyx') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [currentTheme]);

  // Global refresh trigger timestamp to instantly invalidate/refresh ledger statements across views
  const [refreshTrigger, setRefreshTrigger] = useState(Date.now());

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const json = await res.json();
      if (json.success) {
        setAgents(json.data);
      }
    } catch (err) {
      console.error('Failed to load agents list', err);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [location.pathname, refreshTrigger]);

  const handleEntryCreated = () => {
    setEditingVoucher(null);
    setRefreshTrigger(Date.now());
    fetchAgents();
  };

  const handleSelectAgentForLedger = (agent) => {
    setSelectedAgentForLedger(agent);
    navigate('/statements');
  };

  const handleSelectAgentForTagada = (agent) => {
    setSelectedAgentForTagada(agent);
    setIsTagadaModalOpen(true);
  };

  const handleSelectAgentForPayment = (agent) => {
    navigate('/entry');
  };

  const handleSelectEditVoucher = (voucher) => {
    setEditingVoucher(voucher);
    navigate('/entry');
    showToast(`Editing voucher ${voucher.voucherNo || voucher.id}`, 'info');
  };

  const handleLogout = () => {
    localStorage.removeItem('traveledger_auth');
    setUser(null);
    navigate('/login');
  };

  const handleTabChange = (tab) => {
    const tabMap = {
      dashboard: '/dashboard',
      agents: '/agents',
      entry: '/entry',
      statements: '/statements',
      tagada: '/tagada',
      'report-receivables': '/reports/receivables',
      'report-advance': '/reports/advance-deposits',
      'report-ksa': '/reports/ksa-exposure',
      'report-flow': '/reports/daily-flow'
    };
    const target = tabMap[tab] || `/${tab}`;
    navigate(target);
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      {/* Top Navbar Header */}
      {user && (
        <Navbar
          user={user}
          onLogout={handleLogout}
          onQuickEntryClick={() => {
            setEditingVoucher(null);
            navigate('/entry');
          }}
          onTagadaClick={() => setIsTagadaModalOpen(true)}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
        />
      )}

      {/* Main Content View Container */}
      <main className="w-full flex-1 pt-20 px-3 sm:px-6 lg:px-8 pb-10">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user}>
                <Dashboard
                  setActiveTab={handleTabChange}
                  setSelectedAgentForTagada={handleSelectAgentForTagada}
                  onOpenPaymentModal={() => {
                    setEditingVoucher(null);
                    navigate('/entry');
                  }}
                  refreshTrigger={refreshTrigger}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents"
            element={
              <ProtectedRoute user={user}>
                <AgentDirectory
                  onSelectAgentForLedger={handleSelectAgentForLedger}
                  onSelectAgentForTagada={handleSelectAgentForTagada}
                  onSelectAgentForPayment={handleSelectAgentForPayment}
                  showToast={showToast}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/entry"
            element={
              <ProtectedRoute user={user}>
                <DataEntryForm
                  user={user}
                  agents={agents}
                  showToast={showToast}
                  onEntryCreated={handleEntryCreated}
                  editingVoucher={editingVoucher}
                  onCancelEdit={() => setEditingVoucher(null)}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/statements"
            element={
              <ProtectedRoute user={user}>
                <LedgerStatements
                  agents={agents}
                  initialAgent={selectedAgentForLedger}
                  showToast={showToast}
                  refreshTrigger={refreshTrigger}
                  onSelectEditVoucher={handleSelectEditVoucher}
                  onOpenTagada={handleSelectAgentForTagada}
                  onOpenNewVoucher={(ag) => {
                    setSelectedAgentForLedger(ag);
                    setEditingVoucher(null);
                    navigate('/entry');
                  }}
                  onEntryDeleted={handleEntryCreated}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tagada"
            element={
              <ProtectedRoute user={user}>
                <WhatsAppTagadaModal
                  isOpen={true}
                  agents={agents}
                  selectedAgent={selectedAgentForTagada}
                  showToast={showToast}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/receivables"
            element={
              <ProtectedRoute user={user}>
                <ReceivablesReport
                  onBack={() => navigate('/dashboard')}
                  setActiveTab={handleTabChange}
                  setSelectedAgentForTagada={handleSelectAgentForTagada}
                  showToast={showToast}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/advance-deposits"
            element={
              <ProtectedRoute user={user}>
                <AdvanceDepositsReport
                  onBack={() => navigate('/dashboard')}
                  setActiveTab={handleTabChange}
                  showToast={showToast}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/ksa-exposure"
            element={
              <ProtectedRoute user={user}>
                <KsaExposureReport
                  onBack={() => navigate('/dashboard')}
                  showToast={showToast}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/daily-flow"
            element={
              <ProtectedRoute user={user}>
                <DailyFlowReport
                  onBack={() => navigate('/dashboard')}
                  showToast={showToast}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Login
                  onLogin={(u) => {
                    setUser(u);
                    navigate('/dashboard');
                  }}
                />
              )
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      {/* Footer (No Print) */}
      {user && (
        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 no-print">
          <p className="font-bold text-slate-800">
            Arafa Hafiz Ltd. | Umrah & Travel Ledger Management System
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            B2B Sub-Agency & Saudi Supplier Commercial Ledger Engine
          </p>
        </footer>
      )}

      {/* Global Toast Notification */}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
