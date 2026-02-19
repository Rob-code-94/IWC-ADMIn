import React, { useState, useEffect } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { Search, Star, Building2, ChevronDown, ChevronRight, Plus, BarChart3, Trash2, Zap, Edit2, Loader2 } from 'lucide-react';
import { Client } from '@/types';
import { db } from '@/services/firebase';
import { collection, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { EditBankModal } from './EditBankModal';
import { AddLenderToOpsModal } from './AddLenderToOpsModal';
import { FundingProfileCard } from './FundingProfileCard';

interface BankingRelationship {
  id: string;
  institution_name: string;
  name?: string; // Fallback
  bureau?: string; 
  bureaus?: {
      experian: boolean;
      equifax: boolean;
      transUnion: boolean;
  };
  status: 'Interested' | 'Applied' | 'Approved' | 'Denied';
  winner: boolean;
  tier: string;
  minScore?: string | number;
  is_soft_pull?: boolean;
  is_winner?: boolean;
}

export const BankingTab: React.FC<{ client: Client }> = ({ client }) => {
  const [relationships, setRelationships] = useState<BankingRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
      'Experian': true, 'Equifax': true, 'TransUnion': true, 'General': true
  });

  const [editingLender, setEditingLender] = useState<BankingRelationship | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!client.id) return;
    const q = query(collection(db, 'clients', client.id, 'banking_relationships'), orderBy('institution_name', 'asc'));
    return onSnapshot(q, (snap) => {
        setRelationships(snap.docs.map(d => ({ id: d.id, ...d.data() } as BankingRelationship)));
        setLoading(false);
    });
  }, [client.id]);

  const updateStatus = async (lenderId: string, newStatus: string) => {
      setProcessingId(lenderId);
      try {
          const docRef = doc(db, 'clients', client.id, 'banking_relationships', lenderId);
          await setDoc(docRef, { 
              status: newStatus,
              updatedAt: serverTimestamp() 
          }, { merge: true });
          
          // Also sync to active_ops to maintain mirror, using the same ID
          const opsRef = doc(db, 'clients', client.id, 'active_ops', lenderId);
          await setDoc(opsRef, {
              status: newStatus,
              updatedAt: serverTimestamp()
          }, { merge: true });
      } catch (err) {
          console.error("Status update failed:", err);
      } finally {
          setProcessingId(null);
      }
  };

  const removeBank = async (id: string) => {
      if(!confirm("Permanently remove this bank from ALL strategy pipelines (Banking & Active Ops)?")) return;
      
      setProcessingId(id);
      try {
          // TARGET: Specific deterministic ID for Banking
          const docRef = doc(db, 'clients', client.id, 'banking_relationships', id);
          await deleteDoc(docRef);
          
          // TARGET: Specific deterministic ID for Ops
          const opsRef = doc(db, 'clients', client.id, 'active_ops', id);
          await deleteDoc(opsRef);
      } catch (err) {
          console.error("Removal failed:", err);
      } finally {
          setProcessingId(null);
      }
  };

  const toggleSection = (b: string) => setOpenSections(prev => ({ ...prev, [b]: !prev[b] }));

  const getPipelineLists = () => {
      const exp: BankingRelationship[] = [];
      const eq: BankingRelationship[] = [];
      const tu: BankingRelationship[] = [];
      const gen: BankingRelationship[] = [];

      relationships.forEach(rel => {
          const b = rel.bureaus;
          const legacy = rel.bureau?.toLowerCase() || '';
          
          let matched = false;
          if (b?.experian || legacy.includes('experian')) { exp.push(rel); matched = true; }
          if (b?.equifax || legacy.includes('equifax')) { eq.push(rel); matched = true; }
          if (b?.transUnion || legacy.includes('transunion')) { tu.push(rel); matched = true; }
          
          if (!matched) gen.push(rel);
      });

      return { 
          'Experian': exp, 
          'Equifax': eq, 
          'TransUnion': tu, 
          'General': gen 
      };
  };

  const pipelines = getPipelineLists();

  return (
    <div className="h-full flex gap-6 animate-fade-in pb-12 font-sans relative">
        {editingLender && (
            <EditBankModal 
                isOpen={!!editingLender} 
                onClose={() => setEditingLender(null)} 
                clientId={client.id} 
                lender={editingLender} 
            />
        )}

        <AddLenderToOpsModal 
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            clientId={client.id}
            targetCollection="banking_relationships"
        />

        {/* LEFT COLUMN: STRATEGY PIPELINE (Fluid) */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-10">
            {/* HEADER */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Banking Strategy</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Manage institutional relationships.</p>
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#007AFF] text-white rounded-full shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all font-bold text-xs"
                >
                    <Plus size={16} strokeWidth={3} />
                    Add Bank
                </button>
            </div>

            <div className="space-y-8">
                {Object.entries(pipelines).map(([bureau, list]) => {
                    if (list.length === 0 && bureau === 'General') return null;
                    const isOpen = openSections[bureau] ?? true;
                    
                    return (
                        <div key={bureau} className="space-y-4">
                            <button 
                                onClick={() => toggleSection(bureau)}
                                className="w-full flex items-center justify-between px-2 group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-1 h-6 rounded-full shadow-sm
                                        ${bureau === 'Experian' ? 'bg-blue-600 shadow-blue-500/50' : 
                                        bureau === 'Equifax' ? 'bg-emerald-500 shadow-emerald-500/50' : 
                                        bureau === 'TransUnion' ? 'bg-purple-500 shadow-purple-500/50' : 'bg-slate-400'}`} 
                                    />
                                    <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none uppercase">{bureau} Pipeline</h3>
                                    <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{list.length}</span>
                                </div>
                                <div className="text-slate-300 group-hover:text-slate-900 transition-colors">
                                    {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                </div>
                            </button>

                            {isOpen && (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 animate-fade-in">
                                    {list.length === 0 ? (
                                        <div className="col-span-full py-12 text-center border border-dashed border-slate-200 rounded-[2rem] bg-white/40">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest italic">No active {bureau} targets</p>
                                        </div>
                                    ) : (
                                        list.map(rel => (
                                            <LiquidGlassCard key={`${bureau}-${rel.id}`} className="!p-0 shadow-sm hover:shadow-md transition-all relative group overflow-hidden border-white/60">
                                                {/* Processing Overlay */}
                                                {processingId === rel.id && (
                                                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex items-center justify-center">
                                                        <Loader2 className="animate-spin text-[#007AFF]" size={24} />
                                                    </div>
                                                )}

                                                <div className="p-6 space-y-4">
                                                    <div className="flex justify-between items-start">
                                                        <div className="min-w-0 pr-2">
                                                            <h4 className="font-bold text-slate-900 text-base leading-tight tracking-tight truncate uppercase">{rel.institution_name || rel.name}</h4>
                                                            <div className="flex gap-2 mt-2">
                                                                <span className="px-2 py-1 bg-slate-900 text-white text-[8px] font-bold uppercase rounded tracking-wider">{rel.tier || 'Tier 1'}</span>
                                                                <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[8px] font-bold uppercase rounded tracking-wider flex items-center gap-1.5">
                                                                    <BarChart3 size={10} /> {rel.minScore || '---'}+
                                                                </span>
                                                                {rel.is_soft_pull && <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-bold uppercase rounded tracking-wider flex items-center gap-1"><Zap size={8} fill="currentColor" /> SOFT</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            {rel.winner && <Star size={16} fill="#FFD700" className="text-yellow-400" />}
                                                            <button 
                                                                onClick={() => setEditingLender(rel)}
                                                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-blue-500 transition-colors"
                                                                title="Edit Rules"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-1.5 pt-2">
                                                        {['INTERESTED', 'APPLIED', 'APPROVED', 'DENIED'].map(s => {
                                                            const isActive = rel.status?.toUpperCase() === s;
                                                            return (
                                                                <button 
                                                                    key={s} 
                                                                    onClick={() => updateStatus(rel.id, s.charAt(0) + s.slice(1).toLowerCase())}
                                                                    className={`text-[9px] font-bold px-3 py-1.5 rounded transition-all border
                                                                        ${isActive 
                                                                            ? s === 'APPROVED' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20' 
                                                                            : s === 'DENIED' ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20'
                                                                            : 'bg-[#007AFF] text-white border-[#007AFF] shadow-md shadow-blue-500/20'
                                                                            : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}
                                                                    `}
                                                                >
                                                                    {s}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center px-6 py-3 bg-slate-50/50 border-t border-slate-100">
                                                    <div className="flex gap-1.5">
                                                        {rel.bureaus?.experian && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Experian" />}
                                                        {rel.bureaus?.equifax && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Equifax" />}
                                                        {rel.bureaus?.transUnion && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" title="TransUnion" />}
                                                    </div>
                                                    <button onClick={() => removeBank(rel.id)} className="text-[9px] font-bold text-red-400 hover:text-red-700 uppercase tracking-widest transition-colors">REMOVE</button>
                                                </div>
                                            </LiquidGlassCard>
                                        )
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>

        {/* RIGHT COLUMN: FUNDING PROFILE (Sticky - 320px) */}
        <div className="w-[320px] flex-shrink-0">
            <div className="sticky top-0 space-y-6">
                <FundingProfileCard client={client} />
            </div>
        </div>
    </div>
  );
};