import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, TrendingUp, AlertCircle, Search, MessageSquare,
  BookOpen, Download, RefreshCw, Users, DollarSign, Trophy
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function ReceivablesReport({ onBack, setActiveTab, setSelectedAgentForTagada, showToast }) {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [threshold, setThreshold] = useState(0);
  const [sortDir, setSortDir] = useState('desc');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/receivables');
      const json = await res.json();
      if (json.success) {
        setData(json.data || []);
        setSummary(json.summary || {});
      }
    } catch (err) {
      if (showToast) showToast('Failed to load receivables report', 'error');
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
    .filter(a => (a.currentBalance || 0) >= threshold)
    .sort((a, b) => sortDir === 'desc'
      ? (b.currentBalance || 0) - (a.currentBalance || 0)
      : (a.currentBalance || 0) - (b.currentBalance || 0)
    );

  const exportCSV = () => {
    const rows = [
      ['Rank', 'Agency Code', 'Agency Name', 'Phone', 'WhatsApp', 'Outstanding Due (BDT)'],
      ...filtered.map((a, i) => [
        i + 1, a.agencyCode, a.name, a.phone || '', a.whatsapp || '',
        a.currentBalance?.toFixed(2) || '0.00'
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receivables_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    if (showToast) showToast('CSV exported successfully');
  };

  const handleTagada = (agent) => {
    if (setSelectedAgentForTagada) setSelectedAgentForTagada(agent);
    if (setActiveTab) setActiveTab('tagada');
  };

  const handleViewLedger = (agent) => {
    if (setActiveTab) setActiveTab('statements');
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
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
          <span className="text-xs font-bold text-slate-800 dark:text-white">Receivables Report</span>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-teal-600 border border-slate-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-current" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/40 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-rose-600 dark:text-rose-400 text-current" />
            </div>
            <div>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wide">Total Receivables</p>
              <p className="text-xl font-bold text-rose-700 dark:text-rose-300 font-mono">
                {formatCurrency(summary.totalReceivable || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600 dark:text-amber-400 text-current" />
            </div>
            <div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wide">Overdue Agencies Count</p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{summary.count || 0} Agencies</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-2xl p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-400 text-current" />
            </div>
            <div>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wide">Top Debtor</p>
              <p className="text-sm font-bold text-purple-700 dark:text-purple-300 truncate">
                {summary.highestDebtor?.name || 'N/A'}
              </p>
              <p className="text-xs text-purple-500 dark:text-purple-400 font-mono">
                {formatCurrency(summary.highestDebtor?.currentBalance || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center space-x-2 flex-1">
            <TrendingUp className="w-5 h-5 text-rose-500 text-current" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Due Sub-Agency List
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 text-current" />
              <input
                type="text"
                placeholder="Search agency..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs border border-slate-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:ring-2 focus:ring-rose-400 w-44"
              />
            </div>
            <input
              type="number"
              placeholder="Min due (BDT)"
              value={threshold || ''}
              onChange={e => setThreshold(Number(e.target.value) || 0)}
              className="px-3 py-2 text-xs border border-slate-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 w-36"
            />
            <button
              onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-2 text-xs font-semibold border border-slate-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 cursor-pointer"
            >
              Sort: {sortDir === 'desc' ? '↓ Highest' : '↑ Lowest'}
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-teal-700 dark:text-teal-400 border border-teal-300 dark:border-teal-700 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-current" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-rose-500 mr-3" />
              <span className="text-sm text-slate-500">Loading receivables...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-zinc-500">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No receivables found</p>
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-zinc-700">
                  <th className="py-3 px-4 text-left">#</th>
                  <th className="py-3 px-4 text-left">Agency Name</th>
                  <th className="py-3 px-4 text-left">Code</th>
                  <th className="py-3 px-4 text-left">Phone / WhatsApp</th>
                  <th className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">Outstanding Due (BDT)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
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
                    <td className="py-3 px-4 text-slate-600 dark:text-zinc-400">{agent.phone || agent.whatsapp || '—'}</td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                      {formatCurrency(agent.currentBalance || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleViewLedger(agent)}
                          className="flex items-center space-x-1 px-2 py-1 text-[10px] font-bold text-teal-700 dark:text-teal-400 border border-teal-300 dark:border-teal-700 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3 text-current" />
                          <span>Ledger</span>
                        </button>
                        <button
                          onClick={() => handleTagada(agent)}
                          className="flex items-center space-x-1 px-2 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3 text-current" />
                          <span>Notice</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-rose-50 dark:bg-rose-950/30 border-t-2 border-rose-200 dark:border-rose-800/60 font-bold">
                  <td colSpan={4} className="py-3 px-4 text-rose-700 dark:text-rose-400 text-xs">
                    Total ({filtered.length} Agencies)
                  </td>
                  <td className="py-3 px-4 text-right text-rose-700 dark:text-rose-300 font-mono">
                    {formatCurrency(filtered.reduce((s, a) => s + (a.currentBalance || 0), 0))}
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
