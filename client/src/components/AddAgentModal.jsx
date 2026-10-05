import React, { useState } from 'react';
import { X, Building2, UserCheck } from 'lucide-react';

export default function AddAgentModal({ isOpen, onClose, onAgentCreated }) {
  const [name, setName] = useState('');
  const [agencyCode, setAgencyCode] = useState('');
  const [type, setType] = useState('BD_AGENT');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          agencyCode,
          type,
          phone,
          whatsapp: whatsapp || phone,
          address,
          openingBalance: Number(openingBalance) || 0,
          currentBalance: Number(openingBalance) || 0
        })
      });

      const data = await res.json();
      if (data.success) {
        onAgentCreated(data.data);
        onClose();
      } else {
        setError(data.message || 'Failed to create agent');
      }
    } catch (err) {
      setError('Server error connecting to backend API');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-base">Add New Agent / Supplier</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Agent Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full text-xs border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 font-medium text-slate-800 dark:text-zinc-100"
                required
              >
                <option value="BD_AGENT">BD Sub-Agency (Local)</option>
                <option value="SAUDI_AGENT">Saudi Supplier (Overseas)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Agency Code *
              </label>
              <input
                type="text"
                value={agencyCode}
                onChange={(e) => setAgencyCode(e.target.value.toUpperCase())}
                placeholder="e.g. BD-201 or KSA-301"
                className="w-full text-xs border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 uppercase font-mono font-bold text-slate-800 dark:text-zinc-100"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              Agency Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AMAR TRAVELS"
              className="w-full text-xs border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 font-medium text-slate-800 dark:text-zinc-100"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+8801700000000"
                className="w-full text-xs border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-zinc-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+8801700000000"
                className="w-full text-xs border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              Opening Balance ({type === 'BD_AGENT' ? 'BDT' : 'SAR'})
            </label>
            <input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
              className="w-full text-xs border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 font-semibold text-slate-800 dark:text-zinc-100"
            />
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 block">
              Enter positive for receivable/due (e.g. 5000), negative for advance deposit (e.g. -5000).
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Motijheel C/A, Dhaka"
              className="w-full text-xs border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-zinc-100"
            />
          </div>

          <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center space-x-1.5 shadow cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>{submitting ? 'Saving...' : 'Save Agent'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
