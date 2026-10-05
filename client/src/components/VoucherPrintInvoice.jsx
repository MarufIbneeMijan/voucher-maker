import React, { useRef, useState } from 'react';
import { Printer, Download, X, FileText, CheckCircle2, Building2, Calendar, User, Phone, MapPin } from 'lucide-react';
import { formatCurrency, formatSAR } from '../utils/formatters';
import html2pdf from 'html2pdf.js';

export default function VoucherPrintInvoice({ voucher, isOpen, onClose }) {
  const invoiceRef = useRef(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  if (!isOpen || !voucher) return null;

  const b = voucher.breakdown || {};
  const p = voucher.paymentReceived || voucher.paymentDetails || {};
  const t = voucher.totals || {};

  const vNo = voucher.voucherNo || voucher.id || 'VOUCHER';
  const voucherDate = voucher.date ? new Date(voucher.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

  // Service Breakdown Items Array (Filtered for items > 0)
  const serviceRows = [];
  let sl = 1;

  // 1. Umrah Visa
  const visaPax = b.umrahVisa?.pax || b.umrahVisa?.details?.pax || 0;
  const visaCostSAR = b.umrahVisa?.costSAR ? (b.umrahVisa.details?.costPerPaxSAR || Math.round(b.umrahVisa.costSAR / (visaPax || 1))) : 0;
  const visaRate = b.umrahVisa?.rate || 32.5;
  const visaTotalBDT = b.umrahVisa?.totalBDT || (visaPax * visaCostSAR * visaRate);
  if (visaPax > 0 || visaTotalBDT > 0) {
    serviceRows.push({
      sl: sl++,
      desc: b.umrahVisa?.details?.type || 'Umrah Visa',
      sector: 'KSA / Kingdom-wide',
      details: `${visaPax} Pax`,
      costSAR: visaCostSAR ? `SAR ${visaCostSAR}` : '-',
      rate: visaRate,
      totalBDT: visaTotalBDT
    });
  }

  // 2. Makkah Hotel
  const makkahCost = b.hotel?.makkah?.costSAR || (b.hotel?.costSAR && !b.hotel?.madinah ? b.hotel.costSAR : 0);
  const makkahRate = b.hotel?.makkah?.rate || b.hotel?.rate || 32.5;
  const makkahBDT = b.hotel?.makkah?.totalBDT || Math.round(makkahCost * makkahRate);
  const makkahNights = b.hotel?.makkah?.nights || b.hotel?.details?.nights || 0;
  const makkahName = b.hotel?.makkah?.hotelName || b.hotel?.details?.hotelName || 'Makkah Hotel';
  const makkahRoom = b.hotel?.makkah?.roomType || b.hotel?.details?.roomType || 'Standard';
  if (makkahCost > 0 || makkahBDT > 0) {
    serviceRows.push({
      sl: sl++,
      desc: 'Hotel Booking (Makkah)',
      sector: 'Makkah Mukarramah',
      details: `${makkahName} (${makkahNights} Nights, ${makkahRoom})`,
      costSAR: `SAR ${makkahCost}`,
      rate: makkahRate,
      totalBDT: makkahBDT
    });
  }

  // 3. Madinah Hotel
  const madinahCost = b.hotel?.madinah?.costSAR || 0;
  const madinahRate = b.hotel?.madinah?.rate || 32.5;
  const madinahBDT = b.hotel?.madinah?.totalBDT || Math.round(madinahCost * madinahRate);
  const madinahNights = b.hotel?.madinah?.nights || 0;
  const madinahName = b.hotel?.madinah?.hotelName || 'Madinah Hotel';
  const madinahRoom = b.hotel?.madinah?.roomType || 'Standard';
  if (madinahCost > 0 || madinahBDT > 0) {
    serviceRows.push({
      sl: sl++,
      desc: 'Hotel Booking (Madinah)',
      sector: 'Madinah Munawwarah',
      details: `${madinahName} (${madinahNights} Nights, ${madinahRoom})`,
      costSAR: `SAR ${madinahCost}`,
      rate: madinahRate,
      totalBDT: madinahBDT
    });
  }

  // 4. Makkah BRN
  const makkahBrnCost = b.brnCharge?.makkah?.costSAR || 0;
  const makkahBrnRate = b.brnCharge?.rate || 32.5;
  const makkahBrnBDT = Math.round(makkahBrnCost * makkahBrnRate);
  if (makkahBrnCost > 0) {
    serviceRows.push({
      sl: sl++,
      desc: 'BRN Charges (Makkah)',
      sector: 'Makkah Mukarramah',
      details: `${b.brnCharge.makkah.days || 0} Days (Code: ${b.brnCharge.makkah.code || 'BRN-MAK'})`,
      costSAR: `SAR ${makkahBrnCost}`,
      rate: makkahBrnRate,
      totalBDT: makkahBrnBDT
    });
  }

  // 5. Madinah BRN
  const madinahBrnCost = b.brnCharge?.madinah?.costSAR || 0;
  const madinahBrnRate = b.brnCharge?.rate || 32.5;
  const madinahBrnBDT = Math.round(madinahBrnCost * madinahBrnRate);
  if (madinahBrnCost > 0) {
    serviceRows.push({
      sl: sl++,
      desc: 'BRN Charges (Madinah)',
      sector: 'Madinah Munawwarah',
      details: `${b.brnCharge.madinah.days || 0} Days (Code: ${b.brnCharge.madinah.code || 'BRN-MED'})`,
      costSAR: `SAR ${madinahBrnCost}`,
      rate: madinahBrnRate,
      totalBDT: madinahBrnBDT
    });
  }

  // 6. CRN Charges (Makkah / Madinah)
  const makkahCrnCost = b.crnCharge?.makkah?.costSAR || 0;
  const madinahCrnCost = b.crnCharge?.madinah?.costSAR || 0;
  const crnCost = makkahCrnCost + madinahCrnCost;
  const crnRate = b.crnCharge?.rate || 32.5;
  const crnBDT = Math.round(crnCost * crnRate);
  if (crnCost > 0) {
    const codes = [b.crnCharge?.makkah?.code, b.crnCharge?.madinah?.code].filter(Boolean).join(', ') || 'CRN';
    serviceRows.push({
      sl: sl++,
      desc: 'CRN Charges (Makkah/Madinah)',
      sector: 'Holy Cities Sector',
      details: `CRN Code(s): ${codes}`,
      costSAR: `SAR ${crnCost}`,
      rate: crnRate,
      totalBDT: crnBDT
    });
  }

  // 7. Transport & Naqaba Fine
  const transCost = (b.transport?.costSAR || 0) + (b.naqabaFine?.costSAR || 0);
  const transRate = b.transport?.rate || 32.5;
  const transBDT = (b.transport?.totalBDT || 0) + (b.naqabaFine?.totalBDT || 0) || Math.round(transCost * transRate);
  if (transCost > 0 || transBDT > 0) {
    serviceRows.push({
      sl: sl++,
      desc: 'Transport & Naqaba Fine',
      sector: 'KSA Route',
      details: b.transport?.details?.route || 'Sector Route / Naqaba penalty',
      costSAR: `SAR ${transCost}`,
      rate: transRate,
      totalBDT: transBDT
    });
  }

  // 8. Escaped Fine / Penalty
  const escapedCost = b.escapedFine?.costSAR || 0;
  const escapedRate = b.escapedFine?.rate || 32.5;
  const escapedBDT = b.escapedFine?.totalBDT || Math.round(escapedCost * escapedRate);
  if (escapedCost > 0 || escapedBDT > 0) {
    serviceRows.push({
      sl: sl++,
      desc: 'Escaped Fine / Penalty',
      sector: 'Immigration Fine',
      details: 'Haroob Penalty / Escaped charge',
      costSAR: `SAR ${escapedCost}`,
      rate: escapedRate,
      totalBDT: escapedBDT
    });
  }

  // Simplified Pure Voucher Arithmetic: Total Bill = Total Active Services
  const grossBDT = t.grossBDT || voucher.voucherGrossBDT || voucher.totalBillable || serviceRows.reduce((sum, r) => sum + (r.totalBDT || 0), 0);
  const paidBDT = t.paidBDT !== undefined ? t.paidBDT : (voucher.nowPaying !== undefined ? voucher.nowPaying : (p.amountBDT || 0));
  const netDueAdded = grossBDT - paidBDT;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = invoiceRef.current;
    if (!element) return;

    setIsGeneratingPDF(true);
    const opt = {
      margin: [6, 6, 6, 6],
      filename: `Arafa_Hafiz_Voucher_${vNo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        setIsGeneratingPDF(false);
      })
      .catch((err) => {
        console.error('PDF generation error:', err);
        setIsGeneratingPDF(false);
        window.print();
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto no-print-backdrop">
      
      {/* Modal Dialog Container */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden my-auto print:shadow-none print:border-none print:m-0 print:w-full print:max-w-none print:max-h-none">
        
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800 no-print">
          <div className="flex items-center space-x-2.5">
            <FileText className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="text-sm font-bold flex items-center space-x-2">
                <span>Official Commercial Invoice</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                  {vNo}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPDF ? 'Creating PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Close (✕)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable A4 Area */}
        <div className="overflow-y-auto flex-1 p-6 sm:p-10 bg-white text-slate-900 printable-area">
          <div
            id="printable-voucher-invoice"
            ref={invoiceRef}
            className="w-full max-w-[210mm] mx-auto bg-white text-slate-900 p-4 sm:p-6 space-y-6"
            style={{ minHeight: '270mm' }}
          >
            
            {/* 1. HEADER BLOCK */}
            <div className="flex justify-between items-start border-b-2 border-teal-700 pb-5">
              
              {/* Left: Official Company Emblem & Info */}
              <div className="flex items-start space-x-4">
                <img
                  src="/logo.png"
                  alt="Arafa Hafiz Ltd."
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                  className="w-16 h-16 rounded-full object-cover border-2 border-teal-600 shadow-sm"
                />
                <div className="hidden w-16 h-16 rounded-full bg-teal-700 text-white font-black text-xl items-center justify-center border-2 border-teal-600 shadow-sm">
                  AH
                </div>

                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase font-serif">
                    Arafa Hafiz Ltd.
                  </h1>
                  <p className="text-xs font-bold text-teal-800 tracking-wide uppercase">
                    Arafa Hafiz Ltd. | Umrah & Travel B2B Services
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1 leading-tight">
                    Umrah, Hajj & Air Ticketing B2B Services, Dhaka, Bangladesh.
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Hotline: +880 1700-000000 | Email: b2b@arafahafiz.com
                  </p>
                </div>
              </div>

              {/* Right: Invoice Identification & Metadata */}
              <div className="text-right">
                <span className="inline-block bg-teal-700 text-white font-black text-xs px-3 py-1 rounded-md uppercase tracking-wider mb-2">
                  Invoice / Money Receipt
                </span>
                <table className="text-right text-xs ml-auto border-collapse">
                  <tbody>
                    <tr>
                      <td className="font-semibold text-slate-600 pr-2">Voucher No:</td>
                      <td className="font-mono font-black text-teal-900 text-sm">#{vNo}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold text-slate-600 pr-2">Date:</td>
                      <td className="font-mono font-bold text-slate-900">{voucherDate}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold text-slate-600 pr-2">Sub-Agency:</td>
                      <td className="font-bold text-slate-950">{voucher.bdAgent || 'Direct Client'}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold text-slate-600 pr-2">Saudi Supplier:</td>
                      <td className="font-medium text-slate-700">{voucher.saudiAgent || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold text-slate-600 pr-2">Passenger Ref:</td>
                      <td className="font-bold text-teal-800">{voucher.passengerRef || 'Walk-in / General'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>

            {/* 2. ITEMIZED SERVICE BREAKDOWN TABLE */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center justify-between">
                <span>Itemized Commercial Services Breakdown</span>
                <span className="text-[10px] text-slate-500 font-normal">All rates expressed in BDT / SAR</span>
              </div>

              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-10 text-center">SL</th>
                      <th className="py-2.5 px-3">Service Description</th>
                      <th className="py-2.5 px-3">Sector / City</th>
                      <th className="py-2.5 px-3">Details / Days / Nights</th>
                      <th className="py-2.5 px-3 text-right">Cost (SAR)</th>
                      <th className="py-2.5 px-3 text-center">Rate</th>
                      <th className="py-2.5 px-3 text-right">Total (BDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {serviceRows.length > 0 ? (
                      serviceRows.map((row) => (
                        <tr key={row.sl} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 text-center font-mono font-semibold text-slate-500">{row.sl}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{row.desc}</td>
                          <td className="py-2 px-3 text-slate-700">{row.sector}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-800">{row.details}</td>
                          <td className="py-2 px-3 text-right font-mono text-purple-800 font-semibold">{row.costSAR}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-600">{row.rate}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-teal-900">{formatCurrency(row.totalBDT)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                          No itemized service records attached to this voucher
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. SETTLEMENT & PAYMENT BOX (BOTTOM RIGHT) */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
              
              {/* Left Column: Payment Details & In-Hand Notes */}
              <div className="w-full sm:w-1/2 space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5">
                  <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                    Payment Clearance & Transaction Method:
                  </span>
                  <div className="text-slate-700 space-y-1">
                    <p>
                      <strong>Payment Mode:</strong> {p.mode || 'Cash (BDT)'}
                    </p>
                    {p.trxId && (
                      <p className="font-mono text-[11px]">
                        <strong>Transaction / Slip Ref:</strong> {p.trxId}
                      </p>
                    )}
                    {voucher.note && (
                      <p className="text-[11px] text-slate-600 italic mt-1">
                        <strong>Remarks:</strong> {voucher.note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 leading-relaxed italic">
                  * This is an authentic computer generated B2B Commercial Invoice issued by Arafa Hafiz Ltd.
                  All ledger mutations are double-entry audited in the core ledger engine.
                </div>
              </div>

              {/* Right Column: Settlement Summary Matrix */}
              <div className="w-full sm:w-5/12 bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-2 text-xs">
                
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-semibold">Total Amount Due for this Voucher:</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(grossBDT)}</span>
                </div>

                <div className="flex justify-between items-center text-teal-800">
                  <span className="font-semibold">Amount Paid Today:</span>
                  <span className="font-mono font-bold">(-) {formatCurrency(paidBDT)}</span>
                </div>

                <div className="border-t-2 border-slate-300 my-1"></div>

                <div className="flex justify-between items-center pt-1 font-bold">
                  <span className="text-slate-900 text-xs">Remaining Balance on this Voucher:</span>
                  <span className={`font-mono text-sm font-black ${netDueAdded > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {formatCurrency(netDueAdded)}
                  </span>
                </div>

                {netDueAdded <= 0 && (
                  <div className="text-right text-[10px] font-bold text-emerald-700">
                    ✓ Fully Settled
                  </div>
                )}
              </div>

            </div>

            {/* 4. FOOTER & SIGNATURE AREA */}
            <div className="pt-16 grid grid-cols-3 gap-6 text-center text-xs text-slate-700">
              
              {/* Left: Prepared By */}
              <div className="flex flex-col items-center">
                <div className="w-40 border-b border-slate-400 mb-1.5"></div>
                <p className="font-bold text-slate-900">Prepared By</p>
                <p className="text-[10px] font-mono text-slate-500">
                  Operator: {voucher.createdBy || 'Admin'}
                </p>
                <p className="text-[9px] font-mono text-slate-400">
                  Generated On: {new Date().toLocaleString()}
                </p>
              </div>

              {/* Center: Customer / Agent Signature */}
              <div className="flex flex-col items-center">
                <div className="w-40 border-b border-slate-400 mb-1.5"></div>
                <p className="font-bold text-slate-900">Sub-Agency Signature</p>
                <p className="text-[10px] text-slate-500">Authorized Representative</p>
              </div>

              {/* Right: Authorized Seal & Signature */}
              <div className="flex flex-col items-center">
                <div className="w-40 border-b-2 border-teal-700 mb-1.5"></div>
                <p className="font-bold text-teal-900 uppercase">Arafa Hafiz Ltd.</p>
                <p className="text-[10px] text-slate-500 font-semibold">Authorized Seal & Signature</p>
              </div>

            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
