import React, { useState } from 'react';
import { Printer, Edit, X, FileText, Calendar, User, FileSpreadsheet, Building2, CheckCircle2, Trash2 } from 'lucide-react';
import { formatCurrency, formatSAR } from '../utils/formatters';
import ConfirmModal from './ConfirmModal';
import VoucherPrintInvoice from './VoucherPrintInvoice';

export default function VoucherModal({ voucher, isOpen, onClose, onEditVoucher, onDeleteVoucher }) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPrintInvoiceOpen, setIsPrintInvoiceOpen] = useState(false);

  if (!isOpen || !voucher) return null;

  const b = voucher.breakdown || {};
  const p = voucher.paymentReceived || voucher.paymentDetails || {};
  const t = voucher.totals || {};

  const handlePrint = () => {
    window.print();
  };

  const executeDeleteVoucher = async () => {
    const vNo = voucher.voucherNo || voucher.id;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/vouchers/${vNo}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setIsConfirmOpen(false);
        if (onClose) onClose();
        if (onDeleteVoucher) onDeleteVoucher(voucher);
      } else {
        console.error(json.error || json.message || 'Failed to delete voucher');
      }
    } catch (err) {
      console.error('Network error while deleting voucher', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = () => {
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
      rows.push([vNo, voucher.date, voucher.bdAgent, voucher.saudiAgent, voucher.passengerRef, 'Voucher Total', '-', '-', t.grossSAR || 0, t.grossBDT || 0]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pure voucher arithmetic
  const grossBDT = t.grossBDT || voucher.voucherGrossBDT || voucher.totalBillable || 0;
  const paidBDT = t.paidBDT !== undefined ? t.paidBDT : (voucher.nowPaying !== undefined ? voucher.nowPaying : (p.amountBDT || 0));
  const remainingBalance = grossBDT - paidBDT;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm no-print-backdrop">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 my-auto print:shadow-none print:border-none print:m-0 print:w-full print:max-w-none">
        
        {/* Sticky Modal Header */}
        <div className="sticky top-0 z-10 backdrop-blur-md bg-slate-900/95 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 no-print">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-teal-500/20 rounded-xl border border-teal-500/30 text-teal-400">
              <FileText className="w-5 h-5 text-current" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white flex items-center space-x-2">
                <span>Voucher Invoice Details</span>
                <span className="bg-teal-500/20 text-teal-300 text-[11px] font-mono px-2 py-0.5 rounded border border-teal-500/30 font-bold">
                  {voucher.voucherNo || voucher.id}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Arafa Hafiz Ltd. Tax Invoice & Money Receipt</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Close (✕)"
          >
            <X className="w-5 h-5 text-current" />
          </button>
        </div>

        {/* Scrollable Printable Invoice Container */}
        <div className="overflow-y-auto flex-1 p-6 sm:p-8 space-y-6 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 printable-area">
          
          {/* Invoice Header (Arafa Hafiz Ltd. Branding) */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-teal-600 pb-6 gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 bg-teal-600 text-white font-black text-xl rounded-xl flex items-center justify-center shadow">
                  AH
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                    Arafa Hafiz Ltd.
                  </h1>
                  <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">
                    Travel & Umrah B2B Financial Engine
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
                Govt. Approved Hajj & Umrah License No: RL-1082 | Dhaka, Bangladesh
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="inline-block bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-mono font-bold text-base px-4 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800">
                {voucher.voucherNo || voucher.id}
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 flex items-center sm:justify-end space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400 text-current" />
                <span>Date: <strong>{voucher.date}</strong></span>
              </p>
            </div>
          </div>

          {/* Sub-Agent & Saudi Supplier Info Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 text-xs">
            <div>
              <span className="text-slate-500 dark:text-zinc-400 uppercase text-[10px] font-bold block">Billed To (BD Sub-Agency):</span>
              <p className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{voucher.bdAgent}</p>
              <p className="text-slate-600 dark:text-zinc-400">Agency Code: <span className="font-mono font-semibold text-slate-900 dark:text-zinc-200">{voucher.bdAgentId}</span></p>
            </div>

            <div>
              <span className="text-slate-500 dark:text-zinc-400 uppercase text-[10px] font-bold block">Saudi Supplier / Company:</span>
              <p className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{voucher.saudiAgent}</p>
              <p className="text-slate-600 dark:text-zinc-400">Supplier Code: <span className="font-mono font-semibold text-slate-900 dark:text-zinc-200">{voucher.saudiAgentId}</span></p>
            </div>

            {voucher.passengerRef && (
              <div className="sm:col-span-2 pt-2 border-t border-slate-200 dark:border-zinc-700 flex items-center space-x-2">
                <User className="w-4 h-4 text-teal-600 dark:text-teal-400 text-current" />
                <span className="font-bold text-slate-700 dark:text-zinc-300">Passenger / Group Ref:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{voucher.passengerRef}</span>
              </div>
            )}
          </div>

          {/* Itemized Services Breakdown Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Itemized Service Breakdown Matrix
            </h3>
            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-zinc-700">
                    <th className="p-3">Service Line Item</th>
                    <th className="p-3">Details / Reference</th>
                    <th className="p-3 text-center">Days/Pax</th>
                    <th className="p-3 text-right">Cost (SAR)</th>
                    <th className="p-3 text-right">Total (BDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-800 dark:text-zinc-200">

                  {/* Umrah Visa */}
                  {b.umrahVisa?.costSAR > 0 || b.umrahVisa?.totalBDT > 0 ? (
                    <tr>
                      <td className="p-3 font-bold text-teal-700 dark:text-teal-400">Umrah / Multiple Visa</td>
                      <td className="p-3">{b.umrahVisa.details?.type || 'VISA'}</td>
                      <td className="p-3 text-center font-bold">{b.umrahVisa.pax || b.umrahVisa.details?.pax || 0}</td>
                      <td className="p-3 text-right font-mono">{formatSAR(b.umrahVisa.costSAR || 0)}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatCurrency(b.umrahVisa.totalBDT || 0)}</td>
                    </tr>
                  ) : null}

                  {/* Makkah Hotel Allocation */}
                  {b.hotel?.makkah?.costSAR > 0 || b.hotel?.makkah?.totalBDT > 0 ? (
                    <tr>
                      <td className="p-3 font-bold text-teal-700 dark:text-teal-400">Makkah Hotel Allocation</td>
                      <td className="p-3">
                        {b.hotel.makkah.hotelName || 'Makkah Hotel'}
                        {b.hotel.makkah.roomType ? ` (${b.hotel.makkah.roomType})` : ''}
                        {b.hotel.makkah.bookingRef ? ` [Ref: ${b.hotel.makkah.bookingRef}]` : ''}
                        {b.hotel.makkah.checkIn && b.hotel.makkah.checkOut ? ` [${b.hotel.makkah.checkIn} to ${b.hotel.makkah.checkOut}]` : ''}
                      </td>
                      <td className="p-3 text-center font-bold">{b.hotel.makkah.nights || 0} Nights</td>
                      <td className="p-3 text-right font-mono">{formatSAR(b.hotel.makkah.costSAR || 0)}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatCurrency(b.hotel.makkah.totalBDT || 0)}</td>
                    </tr>
                  ) : null}

                  {/* Madinah Hotel Allocation */}
                  {b.hotel?.madinah?.costSAR > 0 || b.hotel?.madinah?.totalBDT > 0 ? (
                    <tr>
                      <td className="p-3 font-bold text-emerald-700 dark:text-emerald-400">Madinah Hotel Allocation</td>
                      <td className="p-3">
                        {b.hotel.madinah.hotelName || 'Madinah Hotel'}
                        {b.hotel.madinah.roomType ? ` (${b.hotel.madinah.roomType})` : ''}
                        {b.hotel.madinah.bookingRef ? ` [Ref: ${b.hotel.madinah.bookingRef}]` : ''}
                        {b.hotel.madinah.checkIn && b.hotel.madinah.checkOut ? ` [${b.hotel.madinah.checkIn} to ${b.hotel.madinah.checkOut}]` : ''}
                      </td>
                      <td className="p-3 text-center font-bold">{b.hotel.madinah.nights || 0} Nights</td>
                      <td className="p-3 text-right font-mono">{formatSAR(b.hotel.madinah.costSAR || 0)}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatCurrency(b.hotel.madinah.totalBDT || 0)}</td>
                    </tr>
                  ) : null}

                  {/* Legacy Single Hotel Allocation */}
                  {!b.hotel?.makkah && !b.hotel?.madinah && (b.hotel?.costSAR > 0 || b.hotel?.totalBDT > 0) ? (
                    <tr>
                      <td className="p-3 font-bold text-teal-700 dark:text-teal-400">Hotel Allocation</td>
                      <td className="p-3">{b.hotel.details?.hotelName || 'Hotel Booking'} ({b.hotel.details?.bookingRef || 'Ref'})</td>
                      <td className="p-3 text-center font-bold">{b.hotel.details?.nights || 0} Nights</td>
                      <td className="p-3 text-right font-mono">{formatSAR(b.hotel.costSAR || 0)}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatCurrency(b.hotel.totalBDT || 0)}</td>
                    </tr>
                  ) : null}

                  {/* Makkah BRN */}
                  {b.brnCharge?.makkah?.costSAR > 0 ? (
                    <tr>
                      <td className="p-3 font-bold text-purple-700 dark:text-purple-400">Makkah BRN Charge</td>
                      <td className="p-3 font-mono">{b.brnCharge.makkah.code || 'BRN'}</td>
                      <td className="p-3 text-center font-bold">{b.brnCharge.makkah.days || 0} Days</td>
                      <td className="p-3 text-right font-mono">{formatSAR(b.brnCharge.makkah.costSAR || 0)}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatCurrency(Math.round((b.brnCharge.makkah.costSAR || 0) * (b.brnCharge.rate || 32.5)))}</td>
                    </tr>
                  ) : null}

                  {/* Madinah BRN */}
                  {b.brnCharge?.madinah?.costSAR > 0 ? (
                    <tr>
                      <td className="p-3 font-bold text-purple-700 dark:text-purple-400">Madinah BRN Charge</td>
                      <td className="p-3 font-mono">{b.brnCharge.madinah.code || 'BRN'}</td>
                      <td className="p-3 text-center font-bold">{b.brnCharge.madinah.days || 0} Days</td>
                      <td className="p-3 text-right font-mono">{formatSAR(b.brnCharge.madinah.costSAR || 0)}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatCurrency(Math.round((b.brnCharge.madinah.costSAR || 0) * (b.brnCharge.rate || 32.5)))}</td>
                    </tr>
                  ) : null}

                  {/* Makkah CRN */}
                  {b.crnCharge?.makkah?.costSAR > 0 ? (
                    <tr>
                      <td className="p-3 font-bold text-sky-700 dark:text-sky-400">Makkah CRN Charge</td>
                      <td className="p-3 font-mono">{b.crnCharge.makkah.code || 'CRN'}</td>
                      <td className="p-3 text-center font-bold">{b.crnCharge.makkah.days || 0} Days</td>
                      <td className="p-3 text-right font-mono">{formatSAR(b.crnCharge.makkah.costSAR || 0)}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatCurrency(Math.round((b.crnCharge.makkah.costSAR || 0) * (b.crnCharge.rate || 32.5)))}</td>
                    </tr>
                  ) : null}

                  {/* Madinah CRN */}
                  {b.crnCharge?.madinah?.costSAR > 0 ? (
                    <tr>
                      <td className="p-3 font-bold text-sky-700 dark:text-sky-400">Madinah CRN Charge</td>
                      <td className="p-3 font-mono">{b.crnCharge.madinah.code || 'CRN'}</td>
                      <td className="p-3 text-center font-bold">{b.crnCharge.madinah.days || 0} Days</td>
                      <td className="p-3 text-right font-mono">{formatSAR(b.crnCharge.madinah.costSAR || 0)}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatCurrency(Math.round((b.crnCharge.madinah.costSAR || 0) * (b.crnCharge.rate || 32.5)))}</td>
                    </tr>
                  ) : null}

                  {/* Transport */}
                  {b.transport?.costSAR > 0 || b.transport?.totalBDT > 0 ? (
                    <tr>
                      <td className="p-3 font-bold text-slate-800 dark:text-zinc-200">Transport & Sector Route</td>
                      <td className="p-3">{b.transport.details?.route || 'Route'}</td>
                      <td className="p-3 text-center font-bold">-</td>
                      <td className="p-3 text-right font-mono">{formatSAR(b.transport.costSAR || 0)}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatCurrency(b.transport.totalBDT || 0)}</td>
                    </tr>
                  ) : null}

                  {/* Naqaba Fine */}
                  {b.naqabaFine?.costSAR > 0 ? (
                    <tr>
                      <td className="p-3 font-bold text-rose-700 dark:text-rose-400">Naqaba Fine</td>
                      <td className="p-3">Naqaba penalty</td>
                      <td className="p-3 text-center font-bold">-</td>
                      <td className="p-3 text-right font-mono">{formatSAR(b.naqabaFine.costSAR || 0)}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatCurrency(b.naqabaFine.totalBDT || 0)}</td>
                    </tr>
                  ) : null}

                  {/* Escaped Fine */}
                  {b.escapedFine?.costSAR > 0 ? (
                    <tr>
                      <td className="p-3 font-bold text-rose-700 dark:text-rose-400">Escaped Fine / Penalties</td>
                      <td className="p-3">Haroob Penalty</td>
                      <td className="p-3 text-center font-bold">-</td>
                      <td className="p-3 text-right font-mono">{formatSAR(b.escapedFine.costSAR || 0)}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatCurrency(b.escapedFine.totalBDT || 0)}</td>
                    </tr>
                  ) : null}

                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Clearance Details */}
          {p && p.mode !== 'NONE' && (
            <div className="bg-sky-50 dark:bg-sky-950/40 p-4 rounded-xl border border-sky-200 dark:border-sky-900 text-xs space-y-1">
              <span className="font-bold text-sky-900 dark:text-sky-300 uppercase text-[10px] block">Payment Received:</span>
              <div className="flex justify-between items-center text-sky-950 dark:text-sky-200 font-semibold">
                <span>Mode: {p.mode} {p.trxId ? `[Trx# ${p.trxId}]` : ''}</span>
                <span className="font-mono font-bold text-sm text-sky-700 dark:text-sky-300">
                  - {formatCurrency(p.amountBDT || paidBDT)}
                </span>
              </div>
            </div>
          )}

          {/* Financial Settlement Reconciliation Matrix */}
          <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-x-auto text-xs shadow-sm">
            <div className="bg-slate-100 dark:bg-zinc-800 px-3.5 py-2 border-b border-slate-200 dark:border-zinc-700 font-bold text-slate-800 dark:text-zinc-200 uppercase text-[10px]">
              📊 Financial Settlement Matrix
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-800 dark:text-zinc-200 text-xs">
                  <tr>
                    <td className="p-2.5 font-medium">Total Bill for this Voucher:</td>
                    <td className="p-2.5 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
                      {formatCurrency(grossBDT)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Amount Paid Today:</td>
                    <td className="p-2.5 text-right font-mono font-bold text-sky-600 dark:text-sky-400">
                      (-) {formatCurrency(paidBDT)}
                    </td>
                  </tr>
                  <tr className="bg-slate-900 text-white font-black text-xs">
                    <td className="p-2.5">Remaining Balance on this Voucher:</td>
                    <td className={`p-2.5 text-right font-mono text-sm ${remainingBalance > 0 ? 'text-rose-400' : 'text-teal-400'}`}>
                      {formatCurrency(remainingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Summary Box */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl flex justify-between items-center text-xs shadow-md">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Gross Invoiced SAR</span>
              <span className="text-lg font-bold font-mono text-purple-400">{formatSAR(t.grossSAR || 0)}</span>
            </div>

            <div className="text-right">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Remaining Balance</span>
              <span className={`text-xl font-black font-mono ${remainingBalance > 0 ? 'text-rose-400' : 'text-teal-400'}`}>
                {formatCurrency(remainingBalance)}
              </span>
            </div>
          </div>

          {/* Signature / Footer */}
          <div className="pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-end text-[11px] text-slate-500 dark:text-zinc-400">
            <div>
              <p>Generated by Arafa Hafiz B2B Ledger System</p>
              <p className="font-mono text-[10px]">{new Date().toLocaleString()}</p>
            </div>
            <div className="text-center">
              <div className="w-36 border-b border-slate-400 dark:border-zinc-600 mb-1"></div>
              <p className="font-bold text-slate-700 dark:text-zinc-300">Authorized Signature</p>
            </div>
          </div>

        </div>

        {/* Sticky Modal Footer Actions */}
        <div className="sticky bottom-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 p-4 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPrintInvoiceOpen(true)}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
              title="Print & Download A4 Voucher PDF"
            >
              <Printer className="w-4 h-4 text-current" />
              <span>Voucher PDF / Print</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
              title="Download Voucher CSV/Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-current" />
              <span>Voucher Excel / CSV</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsConfirmOpen(true)}
              className="px-3.5 py-2 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
              title="Delete Voucher"
            >
              <Trash2 className="w-4 h-4 text-current" />
              <span>Delete</span>
            </button>

            <button
              onClick={() => {
                onClose();
                if (onEditVoucher) onEditVoucher(voucher);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
            >
              <Edit className="w-4 h-4 text-current" />
              <span>Edit Voucher</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDeleteVoucher}
        title="Confirm Voucher Deletion"
        message={`Are you sure you want to delete voucher #${voucher.voucherNo || voucher.id}? This will reverse agent balance changes and remove associated ledger records.`}
        confirmText="Delete Voucher"
        cancelText="Cancel"
        type="danger"
        items={[voucher.voucherNo || voucher.id]}
        loading={isDeleting}
      />

      {/* Itemized Commercial A4 Print/PDF Invoice */}
      <VoucherPrintInvoice
        voucher={voucher}
        isOpen={isPrintInvoiceOpen}
        onClose={() => setIsPrintInvoiceOpen(false)}
      />
    </div>
  );
}
