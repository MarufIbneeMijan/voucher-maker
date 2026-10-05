import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Receipt, CheckCircle2, ArrowRight } from 'lucide-react';

export default function BottomCalculatorDock({
  items = [],
  servicesTotal = 0,
  totalBillable = 0,
  nowPaying = 0,
  netBalance = 0,
  onSubmit,
  isSubmitting = false,
  editingVoucher = null
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const remainingBalance = Number(netBalance) || 0;
  const isFullyPaid = (totalBillable > 0 && remainingBalance === 0) || (totalBillable > 0 && nowPaying >= totalBillable);
  const isAdvance = remainingBalance < 0;
  const isDue = remainingBalance > 0;

  const formatBDT = (num) =>
    '৳ ' + (Number(num) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      {/* 1. Backdrop when Expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* 2. Floating Dock Container */}
      <motion.div
        layout
        className="fixed bottom-0 inset-x-0 z-50 pointer-events-auto"
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-6 pb-3 sm:pb-5">
          <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/15 overflow-hidden transition-all">
            
            {/* Drawer Header (Clickable toggle) */}
            <div 
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-5 py-2.5 bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-zinc-300">
                <Receipt className="w-4 h-4 text-teal-600 dark:text-teal-400"/>
                <span>Voucher Calculation Breakdown</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono">
                  {items.length} {items.length === 1 ? 'Service' : 'Services'}
                </span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200">
                <span>{isExpanded ? 'Hide Details' : 'View Full Details'}</span>
                {isExpanded ? <ChevronDown className="w-4 h-4"/> : <ChevronUp className="w-4 h-4"/>}
              </div>
            </div>

            {/* Expandable Breakdown Drawer */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 py-4 max-h-[300px] overflow-y-auto space-y-3 border-b border-slate-100 dark:border-zinc-800 text-xs"
                >
                  {items.length === 0 ? (
                    <p className="text-center py-4 text-slate-400">No services added yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40">
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-zinc-200">{item.name}</span>
                            <span className="block text-[10px] text-slate-400">{item.detail}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">
                            {formatBDT(item.amountBDT)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary Rows */}
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-1">
                    <div className="flex justify-between text-slate-500">
                      <span>Total Services:</span>
                      <span className="font-mono font-semibold">{formatBDT(servicesTotal)}</span>
                    </div>
                    <div className="flex justify-between text-teal-600 font-medium">
                      <span>Amount Paid:</span>
                      <span className="font-mono font-semibold">(-){formatBDT(nowPaying)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 font-bold">
                      <span>Remaining Balance:</span>
                      <span className="font-mono">{formatBDT(remainingBalance)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Bar: Quick Numbers & Primary CTA */}
            <div className="px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-5 w-full sm:w-auto justify-between sm:justify-start">
                
                {/* Total Bill */}
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Total Bill</span>
                  <span className="font-mono text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {formatBDT(totalBillable)}
                  </span>
                </div>

                <div className="h-8 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />

                {/* Amount Paid */}
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Amount Paid</span>
                  <span className="font-mono text-base sm:text-lg font-bold text-teal-600 dark:text-teal-400">
                    {formatBDT(nowPaying)}
                  </span>
                </div>

                <div className="h-8 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />

                {/* Remaining Balance / Status */}
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">
                    {isFullyPaid ? 'Status' : isAdvance ? 'Extra Paid / Advance' : 'Balance Due'}
                  </span>
                  <div className="flex items-center space-x-1.5 font-mono text-base sm:text-lg font-extrabold">
                    {isFullyPaid ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-sm font-bold">
                        <CheckCircle2 className="w-4 h-4"/> Fully Paid (৳ 0.00)
                      </span>
                    ) : isAdvance ? (
                      <span className="text-blue-600 dark:text-blue-400">
                        {formatBDT(Math.abs(remainingBalance))}
                      </span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400">
                        {formatBDT(remainingBalance)}
                      </span>
                    )}
                  </div>
                </div>

              </div>

              {/* Submit Action Button */}
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-sm shadow-lg shadow-teal-600/25 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {editingVoucher 
                        ? `Update Voucher (${editingVoucher.voucherNo || editingVoucher.id})`
                        : 'Save & Create Voucher'}
                    </span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]"/>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      </motion.div>
    </>
  );
}
