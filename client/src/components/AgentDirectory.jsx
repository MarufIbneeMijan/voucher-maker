import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MessageSquare, 
  BookOpen, 
  Receipt, 
  Building, 
  Phone, 
  ArrowUpRight, 
  ArrowDownLeft,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import AddAgentModal from './AddAgentModal';
import { formatCurrency } from '../utils/formatters';

export default function AgentDirectory({ 
  onSelectAgentForLedger, 
  onSelectAgentForTagada, 
  onSelectAgentForPayment,
  showToast
}) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('ALL'); // ALL, BD_AGENT, SAUDI_AGENT
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      let url = '/api/agents';
      if (activeType !== 'ALL') {
        url += `?type=${activeType}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setAgents(json.data);
      }
    } catch (error) {
      showToast('Error loading agent directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [activeType]);

  const filteredAgents = agents.filter((agent) => {
    const term = searchTerm.toLowerCase();
    return (
      agent.name.toLowerCase().includes(term) ||
      agent.agencyCode.toLowerCase().includes(term) ||
      agent.phone.toLowerCase().includes(term) ||
      (agent.address && agent.address.toLowerCase().includes(term))
    );
  });

  const handleAgentCreated = (newAgent) => {
    showToast(`Agent ${newAgent.name} created successfully!`, 'success');
    fetchAgents();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Users className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>Agent Master Directory</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Manage BD Sub-Agencies & Saudi Suppliers Running Balances
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search agent name, code, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center space-x-1.5 shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Agent</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800 space-x-2">
        <button
          onClick={() => setActiveType('ALL')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
            activeType === 'ALL'
              ? 'border-teal-600 text-teal-700 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-950/30'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          All ({agents.length})
        </button>

        <button
          onClick={() => setActiveType('BD_AGENT')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
            activeType === 'BD_AGENT'
              ? 'border-teal-600 text-teal-700 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-950/30'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          BD Sub-Agencies
        </button>

        <button
          onClick={() => setActiveType('SAUDI_AGENT')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
            activeType === 'SAUDI_AGENT'
              ? 'border-purple-600 text-purple-700 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/30'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          Saudi Suppliers
        </button>
      </div>

      {/* Agent Directory Grid / Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 dark:text-zinc-400 text-sm font-medium">
          Loading Agent Directory...
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl text-center border border-slate-200 dark:border-zinc-800">
          <p className="text-slate-500 dark:text-zinc-400 text-sm font-medium">No agents found matching criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => {
            const isBD = agent.type === 'BD_AGENT';
            const bal = agent.currentBalance || 0;
            const isReceivable = isBD && bal > 0;
            const isDeposit = isBD && bal < 0;

            return (
              <div
                key={agent._id || agent.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-700">
                      {agent.agencyCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isBD
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                          : 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                      }`}
                    >
                      {isBD ? 'BD SUB-AGENCY' : 'SAUDI SUPPLIER'}
                    </span>
                  </div>

                  {/* Name & Details */}
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{agent.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-center space-x-1 mt-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{agent.phone}</span>
                  </p>
                  {agent.address && (
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5 truncate">{agent.address}</p>
                  )}

                  {/* Financial Metrics Box */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-[11px] pb-2 border-b border-slate-200/80 dark:border-zinc-700/80">
                      <div>
                        <span className="text-slate-500 dark:text-zinc-400 block text-[10px]">Total Billed:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                          {isBD ? formatCurrency(agent.totalBilled || 0) : `SAR ${(agent.totalBilled || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 dark:text-zinc-400 block text-[10px]">Total Paid:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {isBD ? formatCurrency(agent.totalPaid || 0) : `SAR ${(agent.totalPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-center space-x-1.5">
                        {isReceivable ? (
                          <ArrowUpRight className="w-4 h-4 text-rose-600" />
                        ) : isDeposit ? (
                          <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          {isBD
                            ? isReceivable
                              ? 'Balance Due'
                              : isDeposit
                              ? 'Advance Balance'
                              : 'Settled'
                            : bal > 0
                            ? 'Payable'
                            : 'Clear'}
                        </span>
                      </div>

                      <span
                        className={`text-sm font-bold font-mono ${
                          isReceivable
                            ? 'text-rose-600 dark:text-rose-400'
                            : isDeposit
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isBD
                            ? 'text-slate-700 dark:text-zinc-300'
                            : 'text-purple-700 dark:text-purple-400'
                        }`}
                      >
                        {isBD ? formatCurrency(Math.abs(bal)) : `SAR ${Math.abs(bal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectAgentForLedger(agent)}
                    className="flex-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center space-x-1 transition cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
                    <span>Ledger</span>
                  </button>

                  <button
                    onClick={() => onSelectAgentForPayment(agent)}
                    className="flex-1 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center space-x-1 transition cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>Payment</span>
                  </button>

                  {isBD && (
                    <button
                      onClick={() => onSelectAgentForTagada(agent)}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center justify-center space-x-1 shadow-xs transition cursor-pointer"
                      title="Send WhatsApp Notice"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Notice</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Agent Modal */}
      <AddAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAgentCreated={handleAgentCreated}
      />
    </div>
  );
}
