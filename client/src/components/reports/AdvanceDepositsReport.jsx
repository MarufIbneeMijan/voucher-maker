import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, RefreshCw, AlertCircle, Search, BookOpen,
  Download, Users, TrendingDown, Banknote, CreditCard
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function AdvanceDepositsReport({ onBack, setActiveTab, showToast }) {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState('asc'); // most negative first

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/advance-deposits');
      const json = await res.json();
      if (json.success) {
        setData(json.data || []);
        setSummary(json.summary || {});
      }
    } catch {
      if (showToast) showToast('Failed to load advance deposits report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = data
    .filter(a => {
      const q = search.toLowerCase();
      return (
        (a.name || '').toLowerCase().includes(q) ||
        (a.agencyCode || '').toLowerCase().includes(q) ||
        (a.phone || '').includes(q)
      );
    })
    .sort((a, b) => sortDir === 'asc'
      ? (a.currentBalance || 0) - (b.currentBalance || 0)   // most negative first
      : (b.currentBalance || 0) - (a.currentBalance || 0)
    );

  const exportCSV = () => {
    const rows = [
      ['Rank', 'Agency Code', 'Agency Name', 'Phone', 'Advance Balance (BDT)'],
      ...filtered.map((a, i) => [
        i + 1, a.agencyCode, a.name, a.phone || '',
        Math.abs(a.currentBalance || 0).toFixed(2)
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `advance_deposits_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    if (showToast) showToast('CSV exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-current" />
            <span>Dashboard</span>
          </button>
          <span className="text-slate-300 dark:text-zinc-600">/</span>
          <span className="text-xs font-bold text-slate-800 dark:text-white">Advance Deposits Audit</span>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-teal-600 border border-slate-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-current" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-2xl p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/40 rounded-xl flex items-center justify-center">
              <Banknote className="w-5 h-5 text-teal-600 dark:text-teal-400 text-current" />
            </div>
            <div>
              <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold uppercase tracking-wide">Total Advance Held</p>
              <p className="text-xl font-bold text-teal-700 dark:text-teal-300">
                {formatCurrency(summary.totalAdvanceHeld || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400 text-current" />
            </div>
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wide">Agencies Count</p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{summary.count || 0} Agencies</p>
            </div>
          </div>
        </div>

        <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 rounded-2xl p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/40 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-sky-600 dark:text-sky-400 text-current" />
            </div>
            <div>
              <p className="text-xs text-sky-600 dark:text-sky-400 font-semibold uppercase tracking-wide">Highest Advance Deposit</p>
              <p className="text-sm font-bold text-sky-700 dark:text-sky-300 truncate">{summary.topAdvanceAgent?.name || 'N/A'}</p>
              <p className="text-xs text-sky-500 dark:text-sky-400 font-mono">
                {formatCurrency(Math.abs(summary.topAdvanceAgent?.currentBalance || 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center space-x-2 flex-1">
            <CreditCard className="w-5 h-5 text-teal-500 text-current" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Advance Deposit Sub-Agencies</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 text-current" />
              <input
                type="text"
                placeholder="Search agency..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs border border-slate-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:ring-2 focus:ring-teal-400 w-44"
              />
            </div>
            <button
              onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 text-xs font-semibold border border-slate-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50"
            >
              Sort: {sortDir === 'asc' ? '↓ Highest Advance' : '↑ Lowest Advance'}
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-teal-700 dark:text-teal-400 border border-teal-300 dark:border-teal-700 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-current" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-500 mr-3" />
              <span className="text-sm text-slate-500">Loading advance deposits...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-zinc-500">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No advance deposits found</p>
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-zinc-700">
                  <th className="py-3 px-4 text-left">#</th>
                  <th className="py-3 px-4 text-left">Agency Name</th>
                  <th className="py-3 px-4 text-left">Code</th>
                  <th className="py-3 px-4 text-left">Phone</th>
                  <th className="py-3 px-4 text-right text-teal-600 dark:text-teal-400">Advance Balance (BDT)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filtered.map((agent, i) => (
                  <tr key={agent._id || agent.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 dark:text-zinc-500 font-mono">{i + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{agent.name}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-2 py-0.5 rounded">
                        {agent.agencyCode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-zinc-400">{agent.phone || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full font-mono">
                        {formatCurrency(Math.abs(agent.currentBalance || 0))}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => setActiveTab && setActiveTab('statements')}
                          className="flex items-center space-x-1 px-2 py-1 text-[10px] font-bold text-teal-700 dark:text-teal-400 border border-teal-300 dark:border-teal-700 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3 text-current" />
                          <span>View Statement</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-teal-50 dark:bg-teal-950/30 border-t-2 border-teal-200 dark:border-teal-800/60 font-bold">
                  <td colSpan={4} className="py-3 px-4 text-teal-700 dark:text-teal-400 text-xs">
                    Total ({filtered.length} Agencies)
                  </td>
                  <td className="py-3 px-4 text-right text-teal-700 dark:text-teal-300 font-mono">
                    {formatCurrency(Math.abs(filtered.reduce((s, a) => s + (a.currentBalance || 0), 0)))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
