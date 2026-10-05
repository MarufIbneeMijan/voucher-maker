import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  Eye, 
  Edit,
  Trash2,
  MessageSquare, 
  PlusCircle, 
  UserCheck, 
  ChevronDown, 
  ChevronUp, 
  Building,
  CreditCard,
  Inbox,
  ArrowUpRight,
  TrendingUp,
  FileCheck,
  RefreshCw,
  CheckSquare,
  Square
} from 'lucide-react';
import VoucherModal from './VoucherModal';
import VoucherPrintInvoice from './VoucherPrintInvoice';
import ConfirmModal from './ConfirmModal';
import { formatCurrency, formatSAR } from '../utils/formatters';


export default function LedgerStatements({ 
  agents, 
  initialAgent, 
  showToast, 
  refreshTrigger,
  onOpenTagada,
  onOpenNewVoucher,
  onSelectEditVoucher,
  onEntryDeleted
}) {
  const [statementType, setStatementType] = useState('BD'); // BD, SAUDI
  const [selectedAgentId, setSelectedAgentId] = useState(initialAgent ? (initialAgent._id || initialAgent.id) : '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({ totalDebit: 0, totalCredit: 0, netBalance: 0 });
  const [loading, setLoading] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Executive Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    type: 'danger',
    items: [],
    onConfirm: null,
    loading: false
  });

  // Modal inspection states
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  // Commercial A4 Print & PDF Invoice Modal
  const [selectedPrintVoucher, setSelectedPrintVoucher] = useState(null);
  const [isPrintInvoiceOpen, setIsPrintInvoiceOpen] = useState(false);

  // Multi-Select Bulk Voucher Deletion states
  const [selectedVoucherNos, setSelectedVoucherNos] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);


  // Separate agents list by type
  const bdAgents = agents.filter((a) => a.type === 'BD_AGENT');
  const saudiAgents = agents.filter((a) => a.type === 'SAUDI_AGENT');
  const currentAgentList = statementType === 'BD' ? bdAgents : saudiAgents;

  useEffect(() => {
    if (initialAgent && initialAgent.type === (statementType === 'BD' ? 'BD_AGENT' : 'SAUDI_AGENT')) {
      setSelectedAgentId(initialAgent._id || initialAgent.id);
    } else if (currentAgentList.length > 0) {
      const exists = currentAgentList.some((a) => (a._id || a.id) === selectedAgentId);
      if (!exists) {
        setSelectedAgentId(currentAgentList[0]._id || currentAgentList[0].id);
      }
    } else {
      setSelectedAgentId('');
    }
  }, [statementType, agents, initialAgent]);

  // Resync all agent balances by replaying ledger entries chronologically
  const handleResyncBalances = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Resync All Balances',
      message: 'This will reset and recalculate all agent ledger balances chronologically from scratch. Do you want to proceed?',
      confirmText: 'Resync Now',
      cancelText: 'Cancel',
      type: 'warning',
      items: [],
      loading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, loading: true }));
        setIsSyncing(true);
        try {
          const res = await fetch('/api/ledgers/recalculate-all', { method: 'POST' });
          const json = await res.json();
          if (json.success) {
            if (showToast) showToast(`✅ ${json.message}`, 'success');
            setConfirmModal((prev) => ({ ...prev, isOpen: false, loading: false }));
            fetchLedgerEntries();
            if (onEntryDeleted) onEntryDeleted();
          } else {
            if (showToast) showToast(json.message || 'Resync failed', 'error');
            setConfirmModal((prev) => ({ ...prev, loading: false }));
          }
        } catch (err) {
          if (showToast) showToast('Network error during resync', 'error');
          setConfirmModal((prev) => ({ ...prev, loading: false }));
        } finally {
          setIsSyncing(false);
        }
      }
    });
  };

  const fetchLedgerEntries = async () => {
    if (!selectedAgentId) return;
    setLoading(true);
    try {
      let url = `/api/ledgers?agentId=${selectedAgentId}&limit=500`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setEntries(json.data);
        setSummary(json.summary || { totalDebit: 0, totalCredit: 0, netBalance: 0 });
      }
    } catch (err) {
      if (showToast) showToast('Error fetching ledger statement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgerEntries();
  }, [selectedAgentId, startDate, endDate, statementType, refreshTrigger]);

  const selectedAgent = agents.find((a) => (a._id || a.id) === selectedAgentId);

  // Helper to fetch/prepare voucher details
  const getVoucherData = async (entry) => {
    const voucherNo = entry.reference || entry.gCode || entry.entryId;
    try {
      const res = await fetch(`/api/entries/batch/${voucherNo}`);
      const json = await res.json();
      if (json.success) {
        return json.data;
      }
    } catch (err) {
      // ignore
    }
    return {
      voucherNo,
      id: voucherNo,
      bdAgent: entry.agentName || selectedAgent?.name || 'BD Agency',
      bdAgentId: entry.agentCode || selectedAgent?.agencyCode || '',
      saudiAgent: entry.saudiAgent?.name || 'BENAA FOR UMRAH',
      saudiAgentId: entry.saudiAgent?.agencyCode || '',
      date: entry.date ? new Date(entry.date).toISOString().split('T')[0] : '',
      passengerRef: entry.passengerName || '',
      breakdown: {
        umrahVisa: { costSAR: entry.debit ? entry.debit / 32.5 : 0, totalBDT: entry.debit || 0 }
      },
      paymentReceived: { mode: entry.paymentMethod || 'NONE', amountBDT: entry.credit || 0 },
      totals: { grossBDT: entry.debit || 0, paidBDT: entry.credit || 0, netDueAdded: (entry.debit || 0) - (entry.credit || 0) }
    };
  };

  // Helper to open voucher modal
  const handleInspectVoucher = async (entry) => {
    const data = await getVoucherData(entry);
    setSelectedVoucher(data);
    setIsVoucherModalOpen(true);
  };

  // Per-Voucher Edit Handler
  const handleEditSingleVoucher = async (entry) => {
    const data = await getVoucherData(entry);
    if (onSelectEditVoucher) {
      onSelectEditVoucher(data);
    }
  };

  // Per-Voucher Delete Handler
  const handleDeleteSingleVoucher = (entry) => {
    const voucherNo = entry.reference || entry.gCode || entry.entryId;
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Voucher Deletion',
      message: `Are you sure you want to delete voucher #${voucherNo}? This will reverse agent balance changes and remove associated ledger records.`,
      confirmText: 'Delete Voucher',
      cancelText: 'Cancel',
      type: 'danger',
      items: [voucherNo],
      loading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, loading: true }));
        try {
          const res = await fetch(`/api/vouchers/${voucherNo}`, { method: 'DELETE' });
          const json = await res.json();
          if (json.success) {
            if (showToast) showToast(`Voucher #${voucherNo} deleted successfully`, 'success');
            setConfirmModal((prev) => ({ ...prev, isOpen: false, loading: false }));
            fetchLedgerEntries();
            if (onEntryDeleted) onEntryDeleted();
          } else {
            if (showToast) showToast(json.error || json.message || 'Failed to delete voucher', 'error');
            setConfirmModal((prev) => ({ ...prev, loading: false }));
          }
        } catch (err) {
          if (showToast) showToast('Error deleting voucher', 'error');
          setConfirmModal((prev) => ({ ...prev, loading: false }));
        }
      }
    });
  };

  // Multi-Select Handlers
  const getVoucherEntries = () => {
    return entries.filter((e) => {
      const ref = e.reference || e.gCode || '';
      return ref.startsWith('VOUCHER-') || e.transactionType === 'VOUCHER_BILL' || e.transactionType === 'UMRAH_PACKAGE';
    });
  };

  const handleToggleSelectAll = () => {
    const vEntries = getVoucherEntries();
    const vNos = vEntries.map((e) => e.reference || e.gCode || e.entryId).filter(Boolean);
    if (selectedVoucherNos.length > 0 && selectedVoucherNos.length === vNos.length) {
      setSelectedVoucherNos([]);
    } else {
      setSelectedVoucherNos(vNos);
    }
  };

  const handleToggleSelectVoucher = (vNo) => {
    if (!vNo) return;
    setSelectedVoucherNos((prev) =>
      prev.includes(vNo) ? prev.filter((id) => id !== vNo) : [...prev, vNo]
    );
  };

  const handleBulkDeleteVouchers = () => {
    if (selectedVoucherNos.length === 0) return;
    const count = selectedVoucherNos.length;
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Bulk Voucher Deletion',
      message: `You are about to delete ${count} vouchers. This will permanently remove all billing and payment records and update agent balances accordingly.`,
      confirmText: `Delete ${count} Vouchers`,
      cancelText: 'Cancel',
      type: 'danger',
      items: selectedVoucherNos,
      loading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, loading: true }));
        setIsBulkDeleting(true);
        try {
          const res = await fetch('/api/vouchers/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voucherNos: selectedVoucherNos })
          });
          const json = await res.json();
          if (json.success) {
            if (showToast) showToast(`✅ ${json.message || `${count} vouchers deleted successfully`}`, 'success');
            setSelectedVoucherNos([]);
            setConfirmModal((prev) => ({ ...prev, isOpen: false, loading: false }));
            fetchLedgerEntries();
            if (onEntryDeleted) onEntryDeleted();
          } else {
            if (showToast) showToast(json.message || 'Failed to delete selected vouchers', 'error');
            setConfirmModal((prev) => ({ ...prev, loading: false }));
          }
        } catch (err) {
          if (showToast) showToast('Network error during bulk delete', 'error');
          setConfirmModal((prev) => ({ ...prev, loading: false }));
        } finally {
          setIsBulkDeleting(false);
        }
      }
    });
  };

  // Per-Voucher PDF Print Handler
  const handlePrintSingleVoucher = async (entry) => {
    const data = await getVoucherData(entry);
    setSelectedPrintVoucher(data);
    setIsPrintInvoiceOpen(true);
  };

  // Per-Voucher CSV Export Handler
  const handleExportSingleVoucherCSV = async (entry) => {
    const voucher = await getVoucherData(entry);
    const b = voucher.breakdown || {};
    const vNo = voucher.voucherNo || voucher.id || 'Voucher';
    const filename = `${vNo}_${voucher.passengerRef ? voucher.passengerRef.replace(/[^a-zA-Z0-9]/g, '_') : 'Invoice'}.csv`;

    const headers = ['Voucher No', 'Date', 'Sub-Agency', 'Saudi Supplier', 'Passenger Ref', 'Service Item', 'Details', 'Days/Pax', 'Cost (SAR)', 'Total (BDT)'];
    const rows = [];
    
    if (b.umrahVisa?.costSAR > 0 || b.umrahVisa?.totalBDT > 0) {
      rows.push([vNo, voucher.date, voucher.bdAgent, voucher.saudiAgent, voucher.passengerRef, 'Umrah Visa', b.umrahVisa.details?.type || 'VISA', b.umrahVisa.pax || 0, b.umrahVisa.costSAR || 0, b.umrahVisa.totalBDT || 0]);
    }
    if (b.hotel?.makkah?.costSAR > 0 || b.hotel?.makkah?.totalBDT > 0) {
      rows.push([vNo, voucher.date, voucher.bdAgent, voucher.saudiAgent, voucher.passengerRef, 'Makkah Hotel', b.hotel.makkah.hotelName || '', b.hotel.makkah.nights || 0, b.hotel.makkah.costSAR || 0, b.hotel.makkah.totalBDT || 0]);
    }
    if (b.hotel?.madinah?.costSAR > 0 || b.hotel?.madinah?.totalBDT > 0) {
      rows.push([vNo, voucher.date, voucher.bdAgent, voucher.saudiAgent, voucher.passengerRef, 'Madinah Hotel', b.hotel.madinah.hotelName || '', b.hotel.madinah.nights || 0, b.hotel.madinah.costSAR || 0, b.hotel.madinah.totalBDT || 0]);
    }
    if (!b.hotel?.makkah && !b.hotel?.madinah && (b.hotel?.costSAR > 0 || b.hotel?.totalBDT > 0)) {
      rows.push([vNo, voucher.date, voucher.bdAgent, voucher.saudiAgent, voucher.passengerRef, 'Hotel Allocation', b.hotel.details?.hotelName || '', b.hotel.details?.nights || 0, b.hotel.costSAR || 0, b.hotel.totalBDT || 0]);
    }
    if (b.brnCharge?.makkah?.costSAR > 0) {
      rows.push([vNo, voucher.date, voucher.bdAgent, voucher.saudiAgent, voucher.passengerRef, 'Makkah BRN', b.brnCharge.makkah.code || '', b.brnCharge.makkah.days || 0, b.brnCharge.makkah.costSAR || 0, Math.round((b.brnCharge.makkah.costSAR || 0) * (b.brnCharge.rate || 32.5))]);
    }
    if (b.brnCharge?.madinah?.costSAR > 0) {
      rows.push([vNo, voucher.date, voucher.bdAgent, voucher.saudiAgent, voucher.passengerRef, 'Madinah BRN', b.brnCharge.madinah.code || '', b.brnCharge.madinah.days || 0, b.brnCharge.madinah.costSAR || 0, Math.round((b.brnCharge.madinah.costSAR || 0) * (b.brnCharge.rate || 32.5))]);
    }
    if (b.crnCharge?.makkah?.costSAR > 0) {
      rows.push([vNo, voucher.date, voucher.bdAgent, voucher.saudiAgent, voucher.passengerRef, 'Makkah CRN', b.crnCharge.makkah.code || '', b.crnCharge.makkah.days || 0, b.crnCharge.makkah.costSAR || 0, Math.round((b.crnCharge.makkah.costSAR || 0) * (b.crnCharge.rate || 32.5))]);
    }
    if (b.crnCharge?.madinah?.costSAR > 0) {
      rows.push([vNo, voucher.date, voucher.bdAgent, voucher.saudiAgent, voucher.passengerRef, 'Madinah CRN', b.crnCharge.madinah.code || '', b.crnCharge.madinah.days || 0, b.crnCharge.madinah.costSAR || 0, Math.round((b.crnCharge.madinah.costSAR || 0) * (b.crnCharge.rate || 32.5))]);
    }
    if (b.transport?.costSAR > 0 || b.transport?.totalBDT > 0) {
      rows.push([vNo, voucher.date, voucher.bdAgent, voucher.saudiAgent, voucher.passengerRef, 'Transport', b.transport.details?.route || '', '-', b.transport.costSAR || 0, b.transport.totalBDT || 0]);
    }
    if (b.naqabaFine?.costSAR > 0) {
      rows.push([vNo, voucher.date, voucher.bdAgent, voucher.saudiAgent, voucher.passengerRef, 'Naqaba Fine', 'Fine', '-', b.naqabaFine.costSAR || 0, b.naqabaFine.totalBDT || 0]);
    }
    if (b.escapedFine?.costSAR > 0) {
      rows.push([vNo, voucher.date, voucher.bdAgent, voucher.saudiAgent, voucher.passengerRef, 'Escaped Fine', 'Penalty', '-', b.escapedFine.costSAR || 0, b.escapedFine.totalBDT || 0]);
    }

    if (rows.length === 0) {
      rows.push([vNo, voucher.date, voucher.bdAgent, voucher.saudiAgent, voucher.passengerRef, 'Voucher Total', '-', '-', voucher.totals?.grossSAR || 0, voucher.totals?.grossBDT || 0]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (showToast) showToast(`Downloaded ${filename}`);
  };

  // Profile calculations
  const curBal = selectedAgent?.currentBalance || 0;
  const whatsappPhone = selectedAgent?.whatsapp || selectedAgent?.phone || '';
  const cleanPhone = whatsappPhone.replace(/[^0-9]/g, '');

  return (
    <div className="space-y-6">
      
      {/* Top Header & Statement Selector */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-slate-200/80 dark:border-zinc-800/80 no-print flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-teal-600 dark:text-teal-400 text-current" />
            <span>Ledger Statements</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Date-wise chronological ledger report with per-voucher PDF/Excel actions
          </p>
        </div>

        {/* Dual Statement Toggle Buttons */}
        <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200/60 dark:border-zinc-700/60">
          <button
            onClick={() => setStatementType('BD')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              statementType === 'BD'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>BD Agency Statement</span>
          </button>

          <button
            onClick={() => setStatementType('SAUDI')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              statementType === 'SAUDI'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Saudi Supplier Statement</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar (No Print) */}
      <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 shadow-sm no-print space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Agent Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
              Select {statementType === 'BD' ? 'BD Sub-Agency' : 'Saudi Supplier'}
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full text-xs border border-slate-300 dark:border-zinc-700 rounded-xl p-2.5 font-bold text-slate-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-teal-500"
            >
              {currentAgentList.map((a) => {
                const idVal = a._id || a.id;
                return (
                  <option key={idVal} value={idVal}>
                    {a.name} ({a.agencyCode}) - Bal: {statementType === 'BD' ? formatCurrency(a.currentBalance || 0) : formatSAR(a.currentBalance || 0)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs border border-slate-300 dark:border-zinc-700 rounded-xl p-2 font-medium bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs border border-slate-300 dark:border-zinc-700 rounded-xl p-2 font-medium bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200"
            />
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="PNR, Voucher#, Ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLedgerEntries()}
                className="w-full text-xs border border-slate-300 dark:border-zinc-700 rounded-xl p-2 pr-8 font-medium bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200"
              />
              <button
                type="button"
                onClick={fetchLedgerEntries}
                className="absolute right-2 top-2 text-slate-400 hover:text-teal-600"
              >
                <Search className="w-4 h-4 text-current" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 pt-3">
          <button
            onClick={() => setShowProfileCard(!showProfileCard)}
            className="text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white flex items-center space-x-1"
          >
            <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 text-current" />
            <span>{showProfileCard ? 'Hide Profile Metrics' : 'Show Profile Metrics'}</span>
            {showProfileCard ? <ChevronUp className="w-4 h-4 text-current" /> : <ChevronDown className="w-4 h-4 text-current" />}
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium hidden sm:block">
              Per-Voucher PDF, Excel & Delete in table rows
            </span>
            <button
              onClick={handleResyncBalances}
              disabled={isSyncing}
              title="Recalculate all agent balances by replaying ledger entries from scratch"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-current ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : '🔄 Resync Balances'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* STREAMLINED SUB-AGENT LEDGER PROFILE METRICS */}
      {selectedAgent && showProfileCard && (
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 shadow-sm no-print space-y-4">
          <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-slate-100 dark:border-zinc-800 pb-3 gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-slate-900 dark:bg-zinc-800 text-teal-400 font-bold text-base rounded-xl flex items-center justify-center border border-slate-800 dark:border-zinc-700">
                {selectedAgent.agencyCode}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>{selectedAgent.name}</span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold ${
                    statementType === 'BD' ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800' : 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                  }`}>
                    {selectedAgent.type}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-center space-x-3 mt-0.5">
                  <span>Phone: <strong>{selectedAgent.phone}</strong></span>
                  {selectedAgent.address && <span>Address: {selectedAgent.address}</span>}
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-2">
              {cleanPhone && (
                <a
                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`السلام عليكم ${selectedAgent.name}, Your current outstanding balance with Arafa Hafiz Ltd. is ${formatCurrency(curBal)}. Please update deposit clearance.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-xs rounded-xl flex items-center space-x-1.5 hover:bg-emerald-100 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-current" />
                  <span>WhatsApp Tagada</span>
                </a>
              )}

              <button
                onClick={() => {
                  if (onOpenNewVoucher) onOpenNewVoucher(selectedAgent);
                }}
                className="px-3.5 py-2 bg-slate-900 dark:bg-zinc-800 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 hover:bg-slate-800 transition"
              >
                <PlusCircle className="w-3.5 h-3.5 text-teal-400 text-current" />
                <span>New Voucher</span>
              </button>
            </div>
          </div>

          {/* THREE-PILLAR FINANCIAL ENGINE METRICS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            {/* Pillar 1: Total Billed */}
            <div className="p-4 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-slate-500 dark:text-zinc-400 font-semibold block text-[11px] uppercase tracking-wider mb-1">
                  1. Total Billed
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                  {statementType === 'BD' 
                    ? formatCurrency(selectedAgent?.totalBilled || summary.totalDebit || 0) 
                    : formatSAR(selectedAgent?.totalBilled || summary.totalDebit || 0)}
                </span>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-full font-bold text-[11px]">
                  Billed
                </span>
              </div>
            </div>

            {/* Pillar 2: Total Paid */}
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 flex items-center justify-between">
              <div>
                <span className="text-slate-500 dark:text-zinc-400 font-semibold block text-[11px] uppercase tracking-wider mb-1">
                  2. Total Paid
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400 tracking-tight">
                  {statementType === 'BD' 
                    ? formatCurrency(selectedAgent?.totalPaid || summary.totalCredit || 0) 
                    : formatSAR(selectedAgent?.totalPaid || summary.totalCredit || 0)}
                </span>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 bg-emerald-600 text-white rounded-full font-bold text-[11px] shadow-sm">
                  Collected
                </span>
              </div>
            </div>

            {/* Pillar 3: Current Due or Advance Balance */}
            <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
              curBal > 0 
                ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60' 
                : curBal < 0
                ? 'bg-sky-50/50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900/60'
                : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-800'
            }`}>
              <div>
                <span className="text-slate-500 dark:text-zinc-400 font-semibold block text-[11px] uppercase tracking-wider mb-1">
                  3. {curBal > 0 ? 'Current Balance Due' : curBal < 0 ? 'Advance Balance' : 'Settled Balance'}
                </span>
                <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                  curBal > 0 
                    ? 'text-rose-700 dark:text-rose-400' 
                    : curBal < 0 
                    ? 'text-sky-700 dark:text-sky-400' 
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}>
                  {statementType === 'BD' ? formatCurrency(Math.abs(curBal)) : formatSAR(Math.abs(curBal))}
                </span>
              </div>

              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full font-bold text-xs shadow-sm ${
                  curBal > 0 
                    ? 'bg-rose-600 text-white' 
                    : curBal < 0
                    ? 'bg-sky-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}>
                  {curBal > 0 ? 'Balance Due' : curBal < 0 ? 'Advance Deposit' : 'Settled'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-SELECT BULK VOUCHER ACTION BAR */}
      {selectedVoucherNos.length > 0 && (
        <div className="bg-slate-900 dark:bg-zinc-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 no-print border border-teal-500/50 sticky top-20 z-40 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-3">
            <span className="bg-teal-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-full font-mono">
              {selectedVoucherNos.length}
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-100">
              Vouchers Selected
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setSelectedVoucherNos([])}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkDeleteVouchers}
              disabled={isBulkDeleting}
              className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl flex items-center space-x-1.5 shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isBulkDeleting ? 'Deleting...' : 'Delete Selected Vouchers'}</span>
            </button>
          </div>
        </div>
      )}

      {/* PRINTABLE STATEMENT CONTAINER */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden printable-area">
        
        {/* Printable Header Branding */}
        <div className="p-6 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white tracking-tight">Arafa Hafiz Ltd.</h2>
              <p className="text-xs text-teal-600 dark:text-teal-400 font-bold uppercase">Official B2B Ledger Statement</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Statement for: <strong className="text-slate-900 dark:text-white">{selectedAgent?.name} ({selectedAgent?.agencyCode})</strong>
              </p>
            </div>
            <div className="text-right text-xs text-slate-600 dark:text-zinc-400 font-mono">
              <p>Printed Date: {new Date().toLocaleDateString('en-GB')}</p>
              <p>Currency: <strong>{statementType === 'BD' ? 'BDT' : 'SAR'}</strong></p>
            </div>
          </div>
        </div>

        {/* Chronological Ledger Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-zinc-700">
                <th className="p-3 w-10 text-center no-print">
                  <input
                    type="checkbox"
                    checked={getVoucherEntries().length > 0 && selectedVoucherNos.length === getVoucherEntries().length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                    title="Select / Deselect All Vouchers"
                  />
                </th>
                <th className="p-3"># Date</th>
                <th className="p-3">Ref / Voucher</th>
                <th className="p-3">Passenger Ref</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Debit</th>
                <th className="p-3 text-right">Credit</th>
                <th className="p-3 text-right">Running Balance</th>
                
                {/* PER-VOUCHER ACTION COLUMN */}
                <th className="p-3 text-center no-print sticky right-0 bg-slate-100 dark:bg-zinc-800 min-w-[180px]">
                  Per-Voucher Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-800 dark:text-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-12 text-center text-slate-500 font-semibold">
                    Loading statement entries...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-12 text-center">
                    <div className="w-full space-y-3">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                        <Inbox className="w-6 h-6 text-current" />
                      </div>
                      <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                        No vouchers found
                      </p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        No vouchers found for selected filters. Create a new service entry or clear search to get started.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => {
                  const runningBal = entry.dynamicRunningBalance !== undefined ? entry.dynamicRunningBalance : entry.runningBalance;
                  const vNo = entry.reference || entry.gCode || '';
                  const isVoucher = vNo.startsWith('VOUCHER-') || entry.transactionType === 'VOUCHER_BILL' || entry.transactionType === 'UMRAH_PACKAGE';
                  const isSelected = selectedVoucherNos.includes(vNo);

                  return (
                    <tr 
                      key={entry._id || index} 
                      className={`transition ${isSelected ? 'bg-teal-50/60 dark:bg-teal-950/30' : 'hover:bg-slate-50/80 dark:hover:bg-zinc-800/50'}`}
                    >
                      <td className="p-3 text-center no-print w-10">
                        {isVoucher ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectVoucher(vNo)}
                            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                        ) : (
                          <span className="text-slate-300 dark:text-zinc-700">•</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[11px] whitespace-nowrap">
                        {entry.date ? new Date(entry.date).toISOString().split('T')[0] : ''}
                      </td>
                      <td className="p-3 font-mono font-bold text-teal-700 dark:text-teal-400 whitespace-nowrap">
                        {entry.reference || entry.gCode || entry.entryId}
                      </td>
                      <td className="p-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        {entry.passengerName || '-'}
                      </td>
                      <td className="p-3 max-w-xs truncate text-slate-700 dark:text-zinc-300">
                        {entry.description}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {entry.debit > 0 ? (statementType === 'BD' ? formatCurrency(entry.debit) : formatSAR(entry.debit)) : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {entry.credit > 0 ? (statementType === 'BD' ? formatCurrency(entry.credit) : formatSAR(entry.credit)) : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-zinc-800/30">
                        {statementType === 'BD' ? formatCurrency(runningBal) : formatSAR(runningBal)}
                      </td>
                      
                      {/* PER-ROW VOUCHER ACTION BUTTONS */}
                      <td className="p-3 text-center no-print sticky right-0 bg-white dark:bg-zinc-900 border-l border-slate-100 dark:border-zinc-800 min-w-[180px]">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 👁️ View Full Bill */}
                          <button
                            type="button"
                            onClick={() => handleInspectVoucher(entry)}
                            className="p-1.5 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-lg transition cursor-pointer"
                            title="View Full Bill (👁️)"
                          >
                            <Eye className="w-4 h-4 text-current" />
                          </button>

                          {/* ✏️ Edit Voucher */}
                          <button
                            type="button"
                            onClick={() => handleEditSingleVoucher(entry)}
                            className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-lg transition cursor-pointer"
                            title="Edit Voucher (✏️)"
                          >
                            <Edit className="w-4 h-4 text-current" />
                          </button>

                          {/* 📄 Single Voucher PDF Print */}
                          <button
                            type="button"
                            onClick={() => handlePrintSingleVoucher(entry)}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition cursor-pointer"
                            title="Voucher PDF (📄)"
                          >
                            <FileText className="w-4 h-4 text-current" />
                          </button>

                          {/* 📊 Single Voucher Excel/CSV Download */}
                          <button
                            type="button"
                            onClick={() => handleExportSingleVoucherCSV(entry)}
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition cursor-pointer"
                            title="Voucher Excel / CSV (📊)"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-current" />
                          </button>

                          {/* 🗑️ Delete Voucher */}
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleVoucher(entry)}
                            className="p-1.5 text-rose-700 dark:text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/80 rounded-lg transition cursor-pointer"
                            title="Delete Voucher (🗑️)"
                          >
                            <Trash2 className="w-4 h-4 text-current" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Summary Footer */}
        <div className="p-4 bg-slate-50 dark:bg-zinc-800/60 border-t border-slate-200 dark:border-zinc-800 flex flex-wrap justify-between items-center text-xs font-bold text-slate-800 dark:text-zinc-200">
          <div>
            <span>Total Records: {entries.length}</span>
          </div>
          <div className="flex items-center space-x-6">
            <span className="text-rose-600 dark:text-rose-400">
              Total Billed: {statementType === 'BD' ? formatCurrency(summary.totalDebit || 0) : formatSAR(summary.totalDebit || 0)}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">
              Total Payments: {statementType === 'BD' ? formatCurrency(summary.totalCredit || 0) : formatSAR(summary.totalCredit || 0)}
            </span>
            <span className="text-slate-900 dark:text-white font-mono text-sm bg-slate-200 dark:bg-zinc-800 px-3 py-1 rounded-xl">
              Net Balance: {statementType === 'BD' ? formatCurrency(summary.netBalance || 0) : formatSAR(summary.netBalance || 0)}
            </span>
          </div>
        </div>

      </div>

      {/* VOUCHER INSPECTION, EDIT & DELETE MODAL */}
      <VoucherModal
        voucher={selectedVoucher}
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        onEditVoucher={(v) => {
          setIsVoucherModalOpen(false);
          if (onSelectEditVoucher) onSelectEditVoucher(v);
        }}
        onDeleteVoucher={(v) => {
          setIsVoucherModalOpen(false);
          if (showToast) showToast(`Voucher ${v.voucherNo || v.id} deleted successfully`, 'success');
          fetchLedgerEntries();
          if (onEntryDeleted) onEntryDeleted();
        }}
      />

      {/* EXECUTIVE CONFIRMATION MODAL */}
      <ConfirmModal
        {...confirmModal}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* VOUCHER ITEMIZED COMMERCIAL A4 PRINT & PDF INVOICE */}
      <VoucherPrintInvoice
        voucher={selectedPrintVoucher}
        isOpen={isPrintInvoiceOpen}
        onClose={() => setIsPrintInvoiceOpen(false)}
      />

    </div>
  );
}
