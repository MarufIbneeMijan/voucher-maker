import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  Building2, 
  MessageSquare, 
  PlusCircle, 
  Receipt, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatSAR } from '../utils/formatters';

export default function Dashboard({ setActiveTab, setSelectedAgentForTagada, onOpenPaymentModal, refreshTrigger }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = '';
      if (dateRange !== 'all') {
        const today = new Date();
        let start = new Date();
        let end = new Date();
        if (dateRange === 'today') {
          // today
        } else if (dateRange === 'week') {
          start.setDate(today.getDate() - today.getDay());
        } else if (dateRange === 'month') {
          start.setDate(1);
        } else if (dateRange === 'last-month') {
          start.setMonth(today.getMonth() - 1);
          start.setDate(1);
          end.setMonth(today.getMonth());
          end.setDate(0);
        } else if (dateRange === 'year') {
          start.setMonth(0);
          start.setDate(1);
        } else if (dateRange === 'custom' && customStart && customEnd) {
          start = new Date(customStart);
          end = new Date(customEnd);
        }
        
        if (dateRange !== 'custom' || (customStart && customEnd)) {
          const sDate = start.toISOString().split('T')[0];
          const eDate = end.toISOString().split('T')[0];
          query = `?startDate=${sDate}&endDate=${eDate}`;
        }
      }
      const res = await fetch('/api/dashboard/summary' + query);
      const json = await res.json();
      if (json.success) {
        setSummary(json.data);
      } else {
        setError(json.message || 'Failed to load dashboard data');
      }
    } catch (err) {
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshTrigger, dateRange, customStart, customEnd]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-3 text-slate-500 font-medium">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
          <span>Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg my-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <span>{error}</span>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="bg-rose-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-rose-700 cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const kpis = summary?.kpis || {};
  const recentTransactions = summary?.recentTransactions || [];
  const overdueAgents = summary?.overdueAgents || [];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>Arafa Hafiz Ltd. - B2B Dashboard</span>
            <span className="text-xs font-normal text-teal-300 bg-teal-950/80 border border-teal-500/40 px-2.5 py-0.5 rounded-full">
              System Status: Active
            </span>
          </h1>
          <p className="text-sm text-teal-200/70 mt-1">
            BD Sub-Agencies & Saudi Suppliers Running Balance Summary
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('entry')}
            className="bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl flex items-center space-x-2 shadow transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Voucher</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: BD Agent Total Receivable */}
        <div 
          onClick={() => setActiveTab('report-receivables')}
          className="group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 relative overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Total Receivables
            </span>
            <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-500 group-hover:text-rose-600 dark:group-hover:text-rose-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRight className="w-4.5 h-4.5 text-current" />
            </div>
          </div>
          <div className="mt-3 flex-1">
            <p className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors">
              {formatCurrency(kpis.totalReceivableBD || 0)}
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              BD Sub-Agencies Owe Us ({kpis.bdOverdueCount || 0} Overdue)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors flex items-center space-x-1">
              <span>View Details</span>
              <ArrowUpRight className="w-3 h-3 text-current" />
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500 dark:bg-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>

        {/* KPI 2: BD Agent Total Advance Received */}
        <div 
          onClick={() => setActiveTab('report-advance')}
          className="group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 relative overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Advance Deposits Held
            </span>
            <div className="w-9 h-9 rounded-full bg-teal-50 dark:bg-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-500 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRight className="w-4.5 h-4.5 text-current" />
            </div>
          </div>
          <div className="mt-3 flex-1">
            <p className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
              {formatCurrency(kpis.totalAdvanceBD || 0)}
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              BD Agents Deposit Balance
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors flex items-center space-x-1">
              <span>View Details</span>
              <ArrowUpRight className="w-3 h-3 text-current" />
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-500 dark:bg-teal-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>

        {/* KPI 3: Period Total Sales Volume */}
        <div 
          onClick={() => setActiveTab('report-flow')}
          className="group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 relative overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Period Sales Volume
            </span>
            <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRight className="w-4.5 h-4.5 text-current" />
            </div>
          </div>
          <div className="mt-3 flex-1">
            <p className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
              {formatCurrency(kpis.periodSalesVolume || 0)}
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Total Sales in selected period
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex items-center space-x-1">
              <span>View Details</span>
              <ArrowUpRight className="w-3 h-3 text-current" />
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500 dark:bg-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>

        {/* KPI 4: Today's Volume & Collections */}
        <div 
          onClick={() => setActiveTab('report-flow')}
          className="group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 relative overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Today's Flow
            </span>
            <div className="w-9 h-9 rounded-full bg-sky-50 dark:bg-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-500 group-hover:text-sky-600 dark:group-hover:text-sky-400 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRight className="w-4.5 h-4.5 text-current" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 flex-1">
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Today's Sales</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {formatCurrency(kpis.todaySalesVolume || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Today's Collections</p>
              <p className="text-base font-bold text-teal-600 dark:text-teal-400 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                {formatCurrency(kpis.todayCollections || 0)}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors flex items-center space-x-1">
              <span>View Details</span>
              <ArrowUpRight className="w-3 h-3 text-current" />
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500 dark:bg-sky-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
      </div>

      {/* Grid: Overdue BD Agents & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Overdue BD Agents */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Top Overdue Sub-Agencies</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Sub-Agencies with highest overdue balances</p>
            </div>
            <button
              onClick={() => setActiveTab('report-receivables')}
              className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <span>All Receivables →</span>
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {overdueAgents.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-zinc-400 py-6 text-center">No overdue agents found.</p>
            ) : (
              overdueAgents.map((agent) => (
                <div
                  key={agent._id || agent.id}
                  className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 rounded-xl p-3 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{agent.name}</span>
                      <span className="text-[10px] bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 px-1.5 py-0.5 rounded font-mono">
                        {agent.agencyCode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{agent.phone}</p>
                    <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1">
                      Balance: {formatCurrency(agent.currentBalance || 0)}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (setSelectedAgentForTagada) setSelectedAgentForTagada(agent);
                      setActiveTab('statements');
                    }}
                    className="bg-slate-900 dark:bg-zinc-950 hover:bg-slate-800 text-teal-300 border border-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1 shadow-xs shrink-0 cursor-pointer"
                  >
                    <span>View Ledger</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recent Transactions Table */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Transactions</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Latest entries posted to Arafa Hafiz Ltd. ledger</p>
            </div>
            <button
              onClick={() => setActiveTab('statements')}
              className="text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
            >
              View Full Statements →
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-zinc-700">
                  <th className="py-2.5 px-3">Voucher No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Agent</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Debit</th>
                  <th className="py-2.5 px-3 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-slate-400">
                      No recent transactions found.
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => (
                    <tr key={tx._id || tx.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                      <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-zinc-300 font-semibold">
                        {tx.entryId || tx.reference}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {tx.agent?.name || tx.agentName || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-400 max-w-xs truncate">
                        {tx.description}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                        {tx.debit > 0 ? (tx.currency === 'SAR' ? formatSAR(tx.debit) : formatCurrency(tx.debit)) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-teal-600 dark:text-teal-400">
                        {tx.credit > 0 ? (tx.currency === 'SAR' ? formatSAR(tx.credit) : formatCurrency(tx.credit)) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
