import React, { useEffect } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { Receipt, CreditCard, ArrowDownRight, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export function AnimatedNumber({ value }) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) =>
    '৳ ' + Math.round(current).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );

  useEffect(() => {
    spring.set(Number(value) || 0);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

export default function LiveCalculatorHUD({ 
  items = [], 
  servicesTotal = 0, 
  totalBillable = 0, 
  nowPaying = 0, 
  netBalance = 0,
  onSubmit,
  isSubmitting = false,
  editingVoucher = null
}) {
  const isSettled = totalBillable > 0 && nowPaying >= totalBillable;
  const isAdvance = totalBillable === 0 && nowPaying > 0;

  return (
    <div className="w-full space-y-4">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl shadow-xl shadow-teal-500/5 p-6"
      >
        {/* Ambient Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Receipt className="w-5 h-5 stroke-[2]"/>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Live Voucher Calculation</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">Real-Time Financial Breakdown</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-500/20">
            <Sparkles className="w-3 h-3 animate-pulse"/> Live HUD
          </span>
        </div>

        {/* Active Line Items Feed */}
        <div className="py-4 space-y-2.5 min-h-[140px] max-h-[260px] overflow-y-auto pr-1">
          <AnimatePresence>
            {items.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-8 text-center text-slate-400 dark:text-zinc-500 text-xs"
              >
                <CreditCard className="w-8 h-8 stroke-[1.5] mb-2 opacity-50"/>
                <span>No services added yet</span>
                <span className="text-[10px] text-slate-400/80">Fill in the service details to see calculations</span>
              </motion.div>
            ) : (
              items.map((item, idx) => (
                <motion.div
                  key={item.id || idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/60"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">{item.name}</span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500">{item.detail}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">
                    ৳ {Number(item.amountBDT || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Core Financial Totals */}
        <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-zinc-800 text-xs">
          <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
            <span>Total Services:</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-zinc-200">
              <AnimatedNumber value={servicesTotal}/>
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-700 dark:text-zinc-300 font-bold">
            <span>Total Bill:</span>
            <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
              <AnimatedNumber value={totalBillable}/>
            </span>
          </div>

          <div className="flex justify-between items-center text-teal-600 dark:text-teal-400 font-medium">
            <span>Amount Paid:</span>
            <span className="font-mono font-bold">
              (-) <AnimatedNumber value={nowPaying}/>
            </span>
          </div>
        </div>

        {/* Final Status Card */}
        <motion.div 
          layout
          className={`mt-4 p-4 rounded-2xl border transition-colors ${
            isSettled
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : isAdvance
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isSettled ? (
                <CheckCircle2 className="w-4 h-4 stroke-[2.2]"/>
              ) : (
                <AlertCircle className="w-4 h-4 stroke-[2.2]"/>
              )}
              <span className="text-xs font-bold uppercase tracking-wider">
                {isSettled ? 'Fully Settled' : isAdvance ? 'Advance Credit' : 'Balance Due'}
              </span>
            </div>
            <span className="font-mono text-base font-extrabold">
              <AnimatedNumber value={Math.abs(netBalance)}/>
            </span>
          </div>
        </motion.div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="mt-4 w-full py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-teal-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <ArrowDownRight className="w-4 h-4 stroke-[2.5]"/>
              <span>
                {editingVoucher
                  ? `Update Voucher (${editingVoucher.voucherNo || editingVoucher.id})`
                  : 'Save & Create Voucher'}
              </span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
