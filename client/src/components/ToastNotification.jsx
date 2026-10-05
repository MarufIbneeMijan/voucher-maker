import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function ToastNotification({ toast, onClose }) {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type !== 'error';

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-3 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700 max-w-md animate-bounce-short">
      {isSuccess ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
      )}
      <div className="flex-1 text-sm font-medium">
        {toast.message}
      </div>
      <button onClick={onClose} className="text-slate-400 hover:text-white">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
