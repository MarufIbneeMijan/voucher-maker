import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, RefreshCw, Calendar, Download, Wallet,
  TrendingUp, TrendingDown, Clock, Search, FileText
} from 'lucide-react';
import { formatCurrency, formatSAR } from '../../utils/formatters';

export default function DailyFlowReport({ onBack, showToast }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/daily-flow?date=${date}`);
      const json = await res.json();
      if (json.success) {
        setEntries(json.data.entries || []);
        setSummary(json.data.summary || {});
      }
    } catch {
      if (showToast) showToast('Failed to load daily flow report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [date]);

  const exportCSV = () => {
    const rows = [
      ['Date/Time', 'Voucher/Ref', 'Agent Name', 'Transaction Type', 'Payment Mode', 'Debit (BDT/SAR)', 'Credit (BDT/SAR)', 'Note'],
      ...entries.map(e => [
        new Date(e.createdAt || e.date).toLocaleString('en-GB'),
        e.reference || e.entryId || '',
        e.agentName || 'N/A',
        e.transactionType || '',
        e.paymentMode || '—',
        (e.debit || 0).toFixed(2),
        (e.credit || 0).toFixed(2),
        `"${(e.description || '').replace(/"/g, '""')}"`
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daily_flow_${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    if (showToast) showToast('CSV exported');
  };

  const handlePrint = () => {
    window.print();
  };

  const netFlow = summary.netFlow || 0;
  const isPositiveFlow = netFlow >= 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Date Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-current" />
            <span>Dashboard</span>
          </button>
          <span className="text-slate-300 dark:text-zinc-600">/</span>
          <span className="text-xs font-bold text-slate-800 dark:text-white">Daily Flow</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2 text-current" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:ring-2 focus:ring-sky-400 font-bold"
            />
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-400 border border-sky-300 dark:border-sky-700 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-current" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-current" />
            <span className="hidden sm:inline">Print PDF</span>
          </button>
          <button
            onClick={fetchData}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-sky-600 border border-slate-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-current" />
          </button>
        </div>
      </div>

      <div className="print-only-container hidden">
        <h2 className="text-xl font-bold text-center mb-2">Arafa Hafiz Ltd. - Daily Day-End Report</h2>
        <p className="text-center text-sm mb-6">Date: {new Date(date).toLocaleDateString('en-GB')}</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/40 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-rose-600 dark:text-rose-400 text-current" />
            </div>
            <div>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wide">Total Billing</p>
              <p className="text-xl font-bold text-rose-700 dark:text-rose-300 font-mono">
                {formatCurrency(summary.totalBilling || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-2xl p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/40 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-teal-600 dark:text-teal-400 text-current" />
            </div>
            <div>
              <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold uppercase tracking-wide">Collections</p>
              <p className="text-xl font-bold text-teal-700 dark:text-teal-300 font-mono">
                {formatCurrency(summary.totalCollections || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className={`border rounded-2xl p-5 ${
          isPositiveFlow
            ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/60'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isPositiveFlow ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
            }`}>
              <Wallet className="w-5 h-5 text-current" />
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${
                isPositiveFlow ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400'
              }`}>Net Flow Impact</p>
              <p className={`text-xl font-bold font-mono ${
                isPositiveFlow ? 'text-sky-700 dark:text-sky-300' : 'text-amber-700 dark:text-amber-300'
              }`}>
                {isPositiveFlow ? '+' : '-'} {formatCurrency(Math.abs(netFlow))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Transaction Stream Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-zinc-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Chronological Transactions Stream</h3>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-sky-500 mr-3" />
              <span className="text-sm text-slate-500">Loading daily transactions...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-zinc-500">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No transactions for this date</p>
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-zinc-700">
                  <th className="py-3 px-4 text-left">Time</th>
                  <th className="py-3 px-4 text-left">Voucher/Ref</th>
                  <th className="py-3 px-4 text-left">Agent / Supplier</th>
                  <th className="py-3 px-4 text-left">Type & Mode</th>
                  <th className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">Debit (Sale)</th>
                  <th className="py-3 px-4 text-right text-teal-600 dark:text-teal-400">Credit (Recv)</th>
                  <th className="py-3 px-4 text-left hidden md:table-cell">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {entries.map((entry, idx) => (
                  <tr key={entry._id || entry.id || idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-zinc-400">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-current" />
                        <span>{new Date(entry.createdAt || entry.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-zinc-200">
                      {entry.reference || entry.entryId || '—'}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {entry.agentName || 'Unknown Agent'}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-700 dark:text-zinc-300">{entry.transactionType}</p>
                      {entry.paymentMode && (
                        <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5">{entry.paymentMode}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                      {entry.debit > 0 ? (entry.currency === 'SAR' ? formatSAR(entry.debit) : formatCurrency(entry.debit)) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-teal-600 dark:text-teal-400 font-mono">
                      {entry.credit > 0 ? (entry.currency === 'SAR' ? formatSAR(entry.credit) : formatCurrency(entry.credit)) : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-zinc-400 hidden md:table-cell max-w-[200px] truncate" title={entry.description}>
                      {entry.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
