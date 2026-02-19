import React, { useState } from 'react';
import { Search, Plus, Pin, Trash2, CheckSquare, Square, X, Filter, ArrowUpDown } from 'lucide-react';
import { Client } from '@/types';
import { useClients } from '@/context/ClientContext';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';

interface ClientSelectionViewProps {
    clients: Client[];
    selectedClientId: string | null;
    onSelectClient: (id: string) => void;
    onAddClick: () => void;
}

export const ClientSelectionView: React.FC<ClientSelectionViewProps> = ({ clients, selectedClientId, onSelectClient, onAddClick }) => {
  const { bulkDeleteClientsData, updateClientData } = useClients();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Filter Logic
  const filteredClients = clients.filter(client => {
      // 1. Text Search
      const term = searchTerm.toLowerCase();
      const name = (client.name || `${client.firstName} ${client.lastName}`).toLowerCase();
      const email = (client.email || '').toLowerCase();
      const matchesSearch = name.includes(term) || email.includes(term);

      // 2. Status Filter
      const matchesStatus = statusFilter === 'All' || client.status === statusFilter;

      return matchesSearch && matchesStatus;
  });

  // Sort Helper
  const sortList = (list: Client[]) => {
      return [...list].sort((a, b) => {
          const nameA = (a.name || `${a.firstName} ${a.lastName}`).toLowerCase();
          const nameB = (b.name || `${b.firstName} ${b.lastName}`).toLowerCase();
          
          if (sortOrder === 'asc') {
              return nameA.localeCompare(nameB);
          } else {
              return nameB.localeCompare(nameA);
          }
      });
  };

  // Segmentation (Pinned Always Top)
  const pinnedClients = sortList(filteredClients.filter(c => c.isPinned));
  const otherClients = sortList(filteredClients.filter(c => !c.isPinned));
  
  // Bulk Mode State
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    await bulkDeleteClientsData(Array.from(selectedIds));
    setIsBulkMode(false);
    setSelectedIds(new Set());
    setShowBulkConfirm(false);
  };

  const toggleBulkMode = () => {
    if (isBulkMode) {
      // Exiting mode
      setIsBulkMode(false);
      setSelectedIds(new Set());
      setShowBulkConfirm(false);
    } else {
      // Entering mode
      setIsBulkMode(true);
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, client: Client) => {
      e.stopPropagation(); // Prevent row selection
      await updateClientData(client.id, { isPinned: !client.isPinned });
  };

  const renderClientRow = (client: Client) => {
    const isSelected = selectedIds.has(client.id);
    const isActive = selectedClientId === client.id;
    
    return (
      <button 
        key={client.id}
        onClick={() => isBulkMode ? toggleSelection(client.id) : onSelectClient(client.id)}
        className={`w-full text-left p-3.5 rounded-[1.5rem] relative transition-all duration-300 group
            ${!isBulkMode && isActive 
                ? 'bg-[#007AFF] text-white shadow-xl shadow-blue-500/20 scale-[1.02]' 
                : 'bg-white/40 hover:bg-white text-slate-600'}
            ${isBulkMode && isSelected ? 'bg-red-50 ring-2 ring-red-200' : ''}
        `}
      >
        {/* Pin Action - Visible on Hover or if Pinned */}
        {!isBulkMode && (
             <div 
                onClick={(e) => handleTogglePin(e, client)}
                className={`absolute top-4 right-4 p-1.5 rounded-full transition-all z-10 cursor-pointer
                    ${client.isPinned 
                        ? (isActive ? 'text-blue-200 hover:text-white' : 'text-blue-500 hover:text-blue-600 hover:bg-blue-50') 
                        : (isActive ? 'text-blue-300 opacity-0 group-hover:opacity-100 hover:text-white' : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-blue-500 hover:bg-slate-100')}
                `}
                title={client.isPinned ? "Unpin Client" : "Pin Client"}
             >
                 <Pin size={14} fill={client.isPinned ? "currentColor" : "none"} />
             </div>
        )}
        
        <div className="flex items-center gap-3">
            {/* Checkbox for Bulk Mode */}
            {isBulkMode && (
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                    ${isSelected ? 'bg-red-500 border-red-500' : 'border-slate-300 bg-white'}
                `}>
                    {isSelected && <CheckSquare size={12} className="text-white" />}
                </div>
            )}

            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-colors
                ${!isBulkMode && isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}
            `}>
                {`${(client.firstName || '')[0]}${(client.lastName || '')[0]}`}
            </div>

            {/* Info */}
            <div className="overflow-hidden">
                <p className="font-bold truncate text-[15px]">{client.name || `${client.firstName} ${client.lastName}`}</p>
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 rounded font-bold uppercase tracking-wider
                        ${!isBulkMode && isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}
                    `}>
                        {client.status || 'Active'}
                    </span>
                </div>
            </div>
        </div>
      </button>
    );
  };

  return (
    <div className="w-80 flex flex-col h-full border-r border-slate-200/60 pr-4 relative">
        
      {/* BULK DELETE CONFIRM OVERLAY */}
      {showBulkConfirm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-white/60 backdrop-blur-sm rounded-[2rem]">
            <LiquidGlassCard className="w-full bg-white shadow-2xl border-red-100 text-center">
                <Trash2 className="mx-auto text-red-500 mb-2" size={32} />
                <h3 className="font-bold text-slate-900 mb-1">Delete {selectedIds.size} Clients?</h3>
                <p className="text-xs text-slate-500 mb-4">This cannot be undone.</p>
                <div className="flex gap-2 justify-center">
                    <button onClick={() => setShowBulkConfirm(false)} className="px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-slate-600">Cancel</button>
                    <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-500 text-white rounded-full text-xs font-bold shadow-lg shadow-red-500/30">Confirm</button>
                </div>
            </LiquidGlassCard>
        </div>
      )}

      <div className="space-y-3 mb-4 pt-2 pl-2">
        <div className="flex justify-between items-center pr-2">
          {isBulkMode ? (
              <div className="flex items-center gap-2 w-full">
                  <button onClick={toggleBulkMode} className="p-2 bg-slate-200 rounded-full text-slate-600 hover:bg-slate-300">
                      <X size={18} />
                  </button>
                  <span className="text-sm font-bold text-slate-700 flex-1 text-center">
                      {selectedIds.size} Selected
                  </span>
                  <button 
                    onClick={() => selectedIds.size > 0 && setShowBulkConfirm(true)}
                    disabled={selectedIds.size === 0}
                    className="p-2 bg-red-100 rounded-full text-red-600 hover:bg-red-200 disabled:opacity-50"
                  >
                      <Trash2 size={18} />
                  </button>
              </div>
          ) : (
              <>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Clients</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={toggleBulkMode}
                        title="Bulk Actions"
                        className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 rounded-full shadow-sm border border-slate-200 hover:text-slate-900 transition-all"
                    >
                        <CheckSquare size={18} />
                    </button>
                    <button 
                        onClick={onAddClick}
                        className="w-10 h-10 flex items-center justify-center bg-[#007AFF] text-white rounded-full shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus size={20} strokeWidth={3} />
                    </button>
                </div>
              </>
          )}
        </div>
        
        {/* Search */}
        <div className="relative group pr-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search clients..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-200/50 hover:bg-slate-200/70 focus:bg-white border-none rounded-[1.2rem] py-3 pl-11 pr-4 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Filters & Sorting */}
        {!isBulkMode && (
            <div className="flex gap-2 pr-2">
                <div className="relative flex-1">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full bg-white/60 hover:bg-white border border-slate-200/60 rounded-xl pl-3 pr-8 py-2 text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Lead">Lead</option>
                        <option value="Onboarding">Onboarding</option>
                        <option value="Dispute">Dispute</option>
                        <option value="Archived">Archived</option>
                    </select>
                    <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                </div>
                <button 
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/60 hover:bg-white border border-slate-200/60 rounded-xl text-[11px] font-bold text-slate-600 hover:text-blue-600 transition-all active:scale-95"
                    title={`Sort ${sortOrder === 'asc' ? 'Z-A' : 'A-Z'}`}
                >
                    <ArrowUpDown size={12} />
                    {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                </button>
            </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pl-2 pr-2">
        {pinnedClients.length > 0 && (
          <>
            <div className="pt-2 pb-1 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400/80">Pinned</div>
            {pinnedClients.map(client => renderClientRow(client))}
          </>
        )}
        
        <div className="pt-4 pb-1 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400/80">All Contacts ({otherClients.length})</div>
        
        {otherClients.length === 0 && pinnedClients.length === 0 ? (
            <div className="text-center py-10 text-slate-400 font-medium text-xs">
                {searchTerm || statusFilter !== 'All' ? "No clients match your filter." : "No clients found."}
            </div>
        ) : (
            otherClients.map(client => renderClientRow(client))
        )}
      </div>
    </div>
  );
};