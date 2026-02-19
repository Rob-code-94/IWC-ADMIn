import React, { useState, useEffect } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { X, Search, Building2, Plus, Star, Zap, Loader2, Filter, ArrowUpDown } from 'lucide-react';
import { db } from '@/services/firebase';
import { collection, query, orderBy, onSnapshot, doc, serverTimestamp, writeBatch } from 'firebase/firestore';

interface AddLenderToOpsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  targetCollection?: 'active_ops' | 'banking_relationships';
}

export const AddLenderToOpsModal: React.FC<AddLenderToOpsModalProps> = ({ 
  isOpen, 
  onClose, 
  clientId, 
  targetCollection = 'active_ops' 
}) => {
  const [lenders, setLenders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Filter States
  const [filterBureau, setFilterBureau] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState<string | null>(null);
  const [filterSoftPull, setFilterSoftPull] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterPreApp, setFilterPreApp] = useState(false);
  const [sortOrder, setSortOrder] = useState<'name' | 'type'>('name');

  useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, 'funding_sources'), orderBy('institution_name', 'asc'));
    return onSnapshot(q, (snap) => {
      setLenders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
  }, [isOpen]);

  const handleAdd = async (lender: any) => {
    setAddingId(lender.id);
    try {
      // GENERATE DETERMINISTIC ID (Slug)
      // Matches global add logic: lowercase, replace spaces with hyphen, remove special chars
      const docId = (lender.institution_name || lender.name || 'bank').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const batch = writeBatch(db);

      const bankData = {
        ...lender,
        id: docId, // Ensure ID is consistent in data
        status: targetCollection === 'active_ops' ? 'Applied' : 'Interested',
        addedVia: targetCollection === 'active_ops' ? 'active_ops_command' : 'banking_library',
        createdAt: serverTimestamp(),
        lastSessionUpdate: serverTimestamp()
      };

      if (targetCollection === 'banking_relationships') {
          // --- DOUBLE WRITE PROTOCOL (Banking -> Ops) ---
          
          // 1. Source of Truth
          const bankingRef = doc(db, 'clients', clientId, 'banking_relationships', docId);
          batch.set(bankingRef, bankData, { merge: true });

          // 2. Operational Mirror
          const opsRef = doc(db, 'clients', clientId, 'active_ops', docId);
          batch.set(opsRef, bankData, { merge: true });
      } else {
          // --- SINGLE WRITE PROTOCOL (Ops Only) ---
          const opsRef = doc(db, 'clients', clientId, 'active_ops', docId);
          batch.set(opsRef, bankData, { merge: true });
      }

      await batch.commit();
      onClose();
    } catch (e) {
      console.error("Failed to add lender:", e);
    } finally {
      setAddingId(null);
    }
  };

  if (!isOpen) return null;

  const filtered = lenders.filter(l => {
    const matchesSearch = (l.institution_name || l.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBureau = filterBureau ? (() => {
      if (!l.bureaus) return false;
      if (filterBureau === 'EXP') return l.bureaus.experian;
      if (filterBureau === 'EQ') return l.bureaus.equifax;
      if (filterBureau === 'TU') return l.bureaus.transUnion;
      return true;
    })() : true;
    const matchesTier = filterTier ? l.tier === filterTier : true;
    const matchesSoft = filterSoftPull ? l.is_soft_pull : true;
    const matchesPreApp = filterPreApp ? (l.is_pre_approval || l.is_soft_pull) : true;
    const matchesType = filterType ? (() => {
      const type = (l.institution_type || l.type || '').toLowerCase();
      if (filterType === 'BANK') return type.includes('bank');
      if (filterType === 'CU') return type.includes('union');
      if (filterType === 'FINTECH') return type.includes('fintech');
      return true;
    })() : true;

    return matchesSearch && matchesBureau && matchesTier && matchesSoft && matchesType && matchesPreApp;
  });

  const sortedList = [...filtered].sort((a, b) => {
    if (sortOrder === 'type') {
      const typeA = (a.institution_type || a.type || '').toLowerCase();
      const typeB = (b.institution_type || b.type || '').toLowerCase();
      return typeA.localeCompare(typeB);
    }
    const nameA = (a.institution_name || a.name || '').toLowerCase();
    const nameB = (b.institution_name || b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <LiquidGlassCard className="w-full max-w-2xl relative z-10 !p-0 overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-white/40 bg-white/50 backdrop-blur-md flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg">
                    <Building2 size={22} />
                </div>
                <h3 className="font-bold text-slate-900 text-xl tracking-tight">
                    {targetCollection === 'active_ops' ? 'Add Operational Target' : 'Add Banking Relationship'}
                </h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="p-4 bg-slate-50/50 border-b border-slate-100 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                      autoFocus
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search global lender intelligence..."
                      className="w-full bg-white rounded-2xl py-4 pl-12 pr-6 text-sm font-semibold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all border border-slate-200"
                  />
              </div>
              <button 
                onClick={() => setSortOrder(sortOrder === 'name' ? 'type' : 'name')}
                title="Toggle Sorting"
                className={`p-4 rounded-2xl border transition-all flex items-center justify-center
                  ${sortOrder === 'type' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}
                `}
              >
                <ArrowUpDown size={18} />
              </button>
            </div>

            {/* Filter Hub */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 mr-2">
                    <Filter size={14} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filters</span>
                </div>
                {['EXP', 'EQ', 'TU'].map(b => (
                    <button
                        key={b}
                        onClick={() => setFilterBureau(filterBureau === b ? null : b)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border
                            ${filterBureau === b ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}
                        `}
                    >
                        {b}
                    </button>
                ))}
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <button
                    onClick={() => setFilterTier(filterTier === 'Tier 1' ? null : 'Tier 1')}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border
                        ${filterTier === 'Tier 1' ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}
                    `}
                >
                    Tier 1
                </button>
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                {['BANK', 'CU', 'FINTECH'].map(t => (
                    <button
                        key={t}
                        onClick={() => setFilterType(filterType === t ? null : t)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border
                            ${filterType === t ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}
                        `}
                    >
                        {t}
                    </button>
                ))}
                <button
                    onClick={() => setFilterSoftPull(!filterSoftPull)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border flex items-center gap-1.5
                        ${filterSoftPull ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}
                    `}
                >
                    <Zap size={10} fill={filterSoftPull ? "currentColor" : "none"} /> Soft Pull
                </button>
                <button
                    onClick={() => setFilterPreApp(!filterPreApp)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border flex items-center gap-1.5
                        ${filterPreApp ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}
                    `}
                >
                    <Star size={10} fill={filterPreApp ? "currentColor" : "none"} /> Pre-App
                </button>
                {(filterBureau || filterTier || filterSoftPull || filterType || filterPreApp || searchTerm) && (
                    <button 
                        onClick={() => { setFilterBureau(null); setFilterTier(null); setFilterSoftPull(false); setFilterType(null); setFilterPreApp(false); setSearchTerm(''); }}
                        className="ml-auto text-[10px] font-bold text-blue-600 hover:underline"
                    >
                        Clear All
                    </button>
                )}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 bg-white/40">
            {loading ? (
                <div className="py-20 text-center text-slate-400 font-bold animate-pulse">Accessing knowledge base...</div>
            ) : sortedList.length === 0 ? (
                <div className="py-20 text-center text-slate-400 font-semibold">
                    <p>No matching lenders found.</p>
                    <p className="text-[10px] mt-2 font-medium">Try adjusting your filters or search term.</p>
                </div>
            ) : (
                sortedList.map(l => (
                    <button 
                        key={l.id} 
                        onClick={() => handleAdd(l)}
                        disabled={addingId === l.id}
                        className="w-full text-left p-4 bg-white/60 hover:bg-white rounded-[1.5rem] border border-transparent hover:border-blue-200 transition-all group flex items-center justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors
                                ${l.is_soft_pull ? 'bg-emerald-50 text-emerald-600' : ''}
                            `}>
                                <Building2 size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-slate-900">{l.institution_name || l.name}</p>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{l.tier || 'Tier 1'}</span>
                                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">•</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{l.institution_type || l.type || 'Bank'}</span>
                                    {l.is_winner && <Star size={10} className="text-yellow-400 fill-yellow-400" />}
                                    {l.is_soft_pull && <Zap size={10} className="text-blue-500 fill-blue-500" />}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                             <div className="flex gap-1">
                                {l.bureaus?.experian && <div className="w-2 h-2 rounded-full bg-blue-500" title="Experian" />}
                                {l.bureaus?.equifax && <div className="w-2 h-2 rounded-full bg-emerald-500" title="Equifax" />}
                                {l.bureaus?.transUnion && <div className="w-2 h-2 rounded-full bg-purple-500" title="TransUnion" />}
                            </div>
                            {addingId === l.id ? <Loader2 className="animate-spin text-blue-600" size={20} /> : <Plus className="text-slate-300 group-hover:text-blue-500" size={20} />}
                        </div>
                    </button>
                ))
            )}
        </div>
      </LiquidGlassCard>
    </div>
  );
};