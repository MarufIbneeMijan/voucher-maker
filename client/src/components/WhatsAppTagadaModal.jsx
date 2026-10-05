import React, { useState, useEffect } from 'react';
import { MessageSquare, ExternalLink, Copy, Check, X, Send } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function WhatsAppTagadaModal({ isOpen, onClose, agents, selectedAgent, showToast }) {
  const bdAgents = (agents || []).filter((a) => a.type === 'BD_AGENT');
  
  const [currentAgentId, setCurrentAgentId] = useState('');
  const [recentTxList, setRecentTxList] = useState([]);
  const [customNote, setCustomNote] = useState('Kindly arrange payment settlement at your earliest convenience.');
  const [bankDetails, setBankDetails] = useState('bKash: 01700000000 | Bank A/C: 123456789 (Dhaka Branch)');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (selectedAgent) {
      setCurrentAgentId(selectedAgent._id || selectedAgent.id);
    } else if (bdAgents.length > 0 && !currentAgentId) {
      setCurrentAgentId(bdAgents[0]._id || bdAgents[0].id);
    }
  }, [selectedAgent, agents]);

  const activeAgent = bdAgents.find((a) => (a._id || a.id) === currentAgentId) || selectedAgent || bdAgents[0];

  useEffect(() => {
    if (activeAgent) {
      const aId = activeAgent._id || activeAgent.id;
      fetch(`/api/ledgers?agentId=${aId}&limit=3`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setRecentTxList(d.data);
        })
        .catch(() => {});
    }
  }, [currentAgentId, activeAgent]);

  // Handle Keyboard Escape listener to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen && !selectedAgent) return null;

  const dueAmount = activeAgent ? activeAgent.currentBalance || 0 : 0;
  const rawPhone = activeAgent ? activeAgent.whatsapp || activeAgent.phone || '' : '';

  // Format phone number for WhatsApp
  let cleanPhone = rawPhone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '88' + cleanPhone;
  }

  // Construct clean English WhatsApp reminder message
  const txSummaryText = recentTxList.length > 0
    ? recentTxList
        .map(
          (t) =>
            `• ${new Date(t.date).toLocaleDateString('en-GB')}: ${t.description} [${t.debit > 0 ? `৳${t.debit} (Debit)` : `৳${t.credit} (Credit)`}]`
        )
        .join('\n')
    : '• No recent transaction records available';

  const fullMessage = `Dear ${activeAgent?.name || ''},
Greetings from Arafa Hafiz Ltd.

Your current running ledger balance summary:
• Agency Code: ${activeAgent?.agencyCode || ''}
• Total Balance Due: ${formatCurrency(dueAmount)}

Recent Transactions:
${txSummaryText}

${customNote}

Payment & Account Details:
${bankDetails}

Thank you,
Arafa Hafiz Ltd.`;

  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullMessage)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullMessage);
    setCopied(true);
    if (showToast) showToast('Reminder message copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    window.open(whatsappUrl, '_blank');
    if (onClose) onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-150"
      >
        {/* Header */}
        <div className="bg-teal-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-teal-300" />
            <h3 className="font-bold text-base">Instant WhatsApp Payment Reminder</h3>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="text-teal-100 hover:text-white hover:bg-teal-600 rounded-full p-1.5 transition flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Agent Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
              Select Sub-Agency
            </label>
            <select
              value={currentAgentId}
              onChange={(e) => setCurrentAgentId(e.target.value)}
              className="w-full text-xs border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-xl p-2.5 font-bold text-slate-800 dark:text-zinc-100 focus:ring-2 focus:ring-teal-500"
            >
              {bdAgents.map((a) => {
                const idVal = a._id || a.id;
                return (
                  <option key={idVal} value={idVal}>
                    {a.name} ({a.agencyCode}) - Balance: {formatCurrency(a.currentBalance || 0)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Quick Balance Alert Badge */}
          {activeAgent && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-rose-800 dark:text-rose-400">Current Balance Due:</span>
                <p className="text-xl font-bold text-rose-700 dark:text-rose-300 font-mono">{formatCurrency(dueAmount)}</p>
              </div>
              <div className="text-right text-xs text-slate-600 dark:text-zinc-400">
                <span className="block font-medium">WhatsApp Phone:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{activeAgent.phone}</span>
              </div>
            </div>
          )}

          {/* Custom Note & Bank Details Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Custom Reminder Note
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full text-xs border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-xl p-2 font-medium text-slate-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Bank & Deposit Details
              </label>
              <input
                type="text"
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                className="w-full text-xs border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-xl p-2 font-medium text-slate-800 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Generated Message Live Preview Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
              Generated Reminder Message Preview
            </label>
            <div className="bg-slate-900 text-teal-300 p-4 rounded-xl font-mono text-xs whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed border border-slate-800 shadow-inner">
              {fullMessage}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2">
            <button
              onClick={handleCopy}
              type="button"
              className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-semibold px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 border border-slate-300 dark:border-zinc-700 transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <div className="flex items-center space-x-2">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl border border-slate-300 dark:border-zinc-700 transition cursor-pointer"
                >
                  Close
                </button>
              )}

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center space-x-2 shadow-lg transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send WhatsApp Reminder</span>
                <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
