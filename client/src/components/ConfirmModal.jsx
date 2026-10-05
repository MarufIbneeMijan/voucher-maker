import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X, Loader2, CheckCircle2, Info } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'info'
  items = [], // e.g. ['VOUCHER-2026-001', 'VOUCHER-2026-002']
  loading = false
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen || loading) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const isDanger = type === 'danger';
  const isWarning = type === 'warning';

  const iconBg = isDanger
    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 ring-rose-200 dark:ring-rose-900/60'
    : isWarning
    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 ring-amber-200 dark:ring-amber-900/60'
    : 'bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 ring-teal-200 dark:ring-teal-900/60';

  const confirmBtnStyle = isDanger
    ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-600/30'
    : isWarning
    ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-amber-600/30'
    : 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white shadow-teal-600/30';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={() => {
        if (!loading) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transition-all scale-100 animate-in zoom-in-95 duration-150"
      >
        {/* Top Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition disabled:opacity-50 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-7 space-y-5">
          {/* Header Icon + Title */}
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-2xl ring-4 flex-shrink-0 ${iconBg}`}>
              {isDanger ? (
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              ) : isWarning ? (
                <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
              ) : (
                <Info className="w-6 h-6 stroke-[2.2]" />
              )}
            </div>

            <div className="flex-1 pt-0.5">
              <h3
                id="confirm-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug"
              >
                {title}
              </h3>
              <div className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                {typeof message === 'string' ? <p>{message}</p> : message}
              </div>
            </div>
          </div>

          {/* Optional Items Badge List */}
          {items && items.length > 0 && (
            <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
                <span>Selected Items ({items.length})</span>
                <span className="font-mono text-slate-500">Selected</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {items.slice(0, 15).map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 shadow-2xs"
                  >
                    {item}
                  </span>
                ))}
                {items.length > 15 && (
                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300">
                    +{items.length - 15} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Warning Note */}
          <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-2xl p-3 text-xs text-rose-800 dark:text-rose-300 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="text-[11px] font-medium leading-tight">
              Warning: Confirming this action will update and recalculate associated agent ledger balances.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition disabled:opacity-50 cursor-pointer"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center space-x-2 transition disabled:opacity-50 cursor-pointer ${confirmBtnStyle}`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-current" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {isDanger && <Trash2 className="w-4 h-4" />}
                  <span>{confirmText}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
