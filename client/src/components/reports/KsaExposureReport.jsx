import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, RefreshCw, AlertCircle, Building2,
  Globe, TrendingUp, CheckCircle, Clock, Download
} from 'lucide-react';
import { formatCurrency, formatSAR } from '../../utils/formatters';

export default function KsaExposureReport({ onBack, showToast }) {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/ksa-exposure');
      const json = await res.json();
      if (json.success) {
        setData(json.data || []);
        setSummary(json.summary || {});
      }
    } catch {
      if (showToast) showToast('Failed to load KSA exposure report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const exportCSV = () => {
    const rows = [
      ['KSA Agency', 'Total Invoiced (SAR)', 'Total Paid (SAR)', 'Outstanding (SAR)', 'BDT Equivalent', 'Status'],
      ...data.map(a => [
        a.name,
        (a.totalInvoicedSAR || 0).toFixed(2),
        (a.totalPaidSAR || 0).toFixed(2),
        (a.outstandingBalanceSAR || 0).toFixed(2),
        (a.outstandingBDT || 0).toFixed(2),
        a.status || 'Clear'
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ksa_exposure_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    if (showToast) showToast('CSV exported');
  };

  const fmtSAR = n => formatSAR(n || 0);
  const fmtBDT = n => formatCurrency(n || 0);

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
          <span className="text-xs font-bold text-slate-800 dark:text-white">KSA Supplier Exposure</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportCSV}
            className="flex items-center space-x-1.5 text-xs font-bold text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-current" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchData}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-teal-600 border border-slate-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-current" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-2xl p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400 text-current" />
            </div>
            <div>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wide">Total Outstanding</p>
              <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{fmtSAR(summary.totalOutstandingSAR)}</p>
              <p className="text-xs text-purple-500 dark:text-purple-400">≈ {fmtBDT(summary.totalOutstandingBDT)}</p>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 text-current" />
            </div>
            <div>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wide">Active Suppliers</p>
              <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{summary.activeCount || 0} Suppliers</p>
            </div>
          </div>
        </div>

        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/40 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-rose-600 dark:text-rose-400 text-current" />
            </div>
            <div>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wide">Exchange Rate</p>
              <p className="text-xl font-bold text-rose-700 dark:text-rose-300">32.50 BDT / SAR</p>
            </div>
          </div>
        </div>
      </div>

      {/* Supplier Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-500 mr-3" />
          <span className="text-sm text-slate-500">Loading KSA exposure data...</span>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-20 text-slate-400 dark:text-zinc-500">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No Saudi suppliers found</p>
        </div>
      ) : (
        <>
          {/* Supplier Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map(supplier => {
              const isPending = (supplier.outstandingBalanceSAR || 0) > 0;
              return (
                <div
                  key={supplier._id || supplier.id}
                  className={`rounded-2xl border p-5 space-y-3 ${
                    isPending
                      ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50'
                      : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isPending ? 'bg-rose-100 dark:bg-rose-900/40' : 'bg-emerald-100 dark:bg-emerald-900/40'
                      }`}>
                        <Building2 className={`w-4.5 h-4.5 text-current ${isPending ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{supplier.name}</p>
                        <p className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">{supplier.agencyCode}</p>
                      </div>
                    </div>
                    <span className={`flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isPending
                        ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                        : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {isPending
                        ? <><Clock className="w-3 h-3 text-current" /><span>Pending</span></>
                        : <><CheckCircle className="w-3 h-3 text-current" /><span>Clear</span></>
                      }
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500 dark:text-zinc-400">Total Invoiced</p>
                      <p className="font-bold text-slate-800 dark:text-zinc-200">{fmtSAR(supplier.totalInvoicedSAR)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-zinc-400">Total Paid</p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">{fmtSAR(supplier.totalPaidSAR)}</p>
                    </div>
                    <div className="col-span-2 border-t border-slate-200 dark:border-zinc-700 pt-2">
                      <p className="text-slate-500 dark:text-zinc-400">Outstanding Balance</p>
                      <p className={`text-base font-bold ${isPending ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {fmtSAR(supplier.outstandingBalanceSAR)}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-500">≈ {fmtBDT(supplier.outstandingBDT)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Detailed Supplier Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-zinc-700">
                    <th className="py-3 px-4 text-left">KSA Agency</th>
                    <th className="py-3 px-4 text-right">Total Invoiced (SAR)</th>
                    <th className="py-3 px-4 text-right">Paid via Arafa (SAR)</th>
                    <th className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">Outstanding (SAR)</th>
                    <th className="py-3 px-4 text-right">BDT Equivalent</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {data.map(supplier => {
                    const isPending = (supplier.outstandingBalanceSAR || 0) > 0;
                    return (
                      <tr key={supplier._id || supplier.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 dark:text-white">{supplier.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">{supplier.agencyCode}</p>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-zinc-300">
                          {fmtSAR(supplier.totalInvoicedSAR)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {fmtSAR(supplier.totalPaidSAR)}
                        </td>
                        <td className={`py-3 px-4 text-right font-bold ${isPending ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {fmtSAR(supplier.outstandingBalanceSAR)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-zinc-400">
                          {fmtBDT(supplier.outstandingBDT)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPending
                              ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                              : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                          }`}>
                            {isPending
                              ? <><Clock className="w-3 h-3 text-current" /><span>Pending</span></>
                              : <><CheckCircle className="w-3 h-3 text-current" /><span>Clear</span></>
                            }
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-purple-50 dark:bg-purple-950/30 border-t-2 border-purple-200 dark:border-purple-800/60 font-bold">
                    <td className="py-3 px-4 text-purple-700 dark:text-purple-400 text-xs">Total ({data.length})</td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-zinc-300">
                      {fmtSAR(data.reduce((s, a) => s + (a.totalInvoicedSAR || 0), 0))}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                      {fmtSAR(data.reduce((s, a) => s + (a.totalPaidSAR || 0), 0))}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-700 dark:text-rose-300">
                      {fmtSAR(summary.totalOutstandingSAR)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-zinc-300">
                      {fmtBDT(summary.totalOutstandingBDT)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
