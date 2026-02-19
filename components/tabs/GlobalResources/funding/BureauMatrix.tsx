import React, { useState, useEffect } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { ArrowLeft, Map, Loader2, Database } from 'lucide-react';
import { db } from '@/services/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface BureauMatrixProps {
  onBack: () => void;
}

// Interface matching your Firestore Schema
interface Lender {
  id: string;
  institution_name?: string;
  name?: string; // Fallback for older records
  institution_type?: string;
  type?: string; // Fallback
  tier: string;
  bureaus: {
    experian: boolean;
    equifax: boolean;
    transUnion: boolean; // CamelCase as per DB
  };
  notes?: string;
}

export const BureauMatrix: React.FC<BureauMatrixProps> = ({ onBack }) => {
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [loading, setLoading] = useState(true);

  // FETCH REAL-TIME DATA
  useEffect(() => {
    const q = query(collection(db, 'funding_sources'), orderBy('institution_name', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lender));
      // Sort handling for fallback names if institution_name is missing is done better in JS sort if needed, 
      // but Firestore orderBy is sufficient for now given the schema update.
      setLenders(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Helper Helpers
  const getName = (l: Lender) => l.institution_name || l.name || 'Unknown Bank';
  const getType = (l: Lender) => l.institution_type || l.type || 'Bank';
  const getNote = (l: Lender) => l.notes ? (l.notes.length > 50 ? l.notes.substring(0, 50) + '...' : l.notes) : 'No specific strategy notes available.';

  // Filter Lists
  const experianList = lenders.filter(l => l.bureaus?.experian);
  const equifaxList = lenders.filter(l => l.bureaus?.equifax);
  const transUnionList = lenders.filter(l => l.bureaus?.transUnion);

  return (
    <div className="space-y-6 animate-fade-in pb-12 h-full flex flex-col">
       {/* Header */}
       <div className="flex items-center gap-4 flex-shrink-0">
            <button 
                onClick={onBack}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-sm transition-all hover:scale-105 active:scale-95"
            >
                <ArrowLeft size={20} />
            </button>
            <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Bureau Matrix</h2>
                <p className="text-slate-500 font-medium">Strategic pull mapping by bureau.</p>
            </div>
            
            {!loading && (
                <div className="ml-auto bg-white/40 px-4 py-2 rounded-full text-xs font-bold text-slate-500 border border-white/50">
                    {lenders.length} Sources Mapped
                </div>
            )}
        </div>

        {/* The Matrix */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0">
            
            {/* EXPERIAN COLUMN */}
            <div className="flex flex-col h-full bg-blue-50/30 rounded-[2.5rem] border border-blue-100 overflow-hidden">
                <div className="p-6 bg-blue-100/50 border-b border-blue-200/50 backdrop-blur-md sticky top-0 z-10">
                    <h3 className="text-lg font-black text-blue-700 uppercase tracking-widest text-center">Experian</h3>
                    <p className="text-xs text-blue-600 text-center font-bold mt-1">Primary for Big Banks</p>
                    <div className="mt-2 text-center">
                        <span className="text-[10px] font-bold bg-white/60 text-blue-800 px-2 py-1 rounded-full">{experianList.length} Lenders</span>
                    </div>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                    {loading ? (
                        <div className="text-center py-10 text-blue-400/50"><Loader2 className="animate-spin mx-auto" /></div>
                    ) : experianList.length === 0 ? (
                        <div className="text-center py-10 text-blue-400 text-xs font-bold">No data found</div>
                    ) : (
                        experianList.map((lender) => (
                            <LiquidGlassCard key={lender.id} className="!p-4 bg-white/60 hover:bg-white hover:scale-[1.02] transition-all cursor-pointer border-blue-100 group">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{getName(lender)}</h4>
                                    <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">{lender.tier}</span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">{getNote(lender)}</p>
                            </LiquidGlassCard>
                        ))
                    )}
                </div>
            </div>

            {/* EQUIFAX COLUMN */}
            <div className="flex flex-col h-full bg-emerald-50/30 rounded-[2.5rem] border border-emerald-100 overflow-hidden">
                <div className="p-6 bg-emerald-100/50 border-b border-emerald-200/50 backdrop-blur-md sticky top-0 z-10">
                    <h3 className="text-lg font-black text-emerald-700 uppercase tracking-widest text-center">Equifax</h3>
                    <p className="text-xs text-emerald-600 text-center font-bold mt-1">Credit Unions & Southern Banks</p>
                    <div className="mt-2 text-center">
                        <span className="text-[10px] font-bold bg-white/60 text-emerald-800 px-2 py-1 rounded-full">{equifaxList.length} Lenders</span>
                    </div>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                    {loading ? (
                        <div className="text-center py-10 text-emerald-400/50"><Loader2 className="animate-spin mx-auto" /></div>
                    ) : equifaxList.length === 0 ? (
                        <div className="text-center py-10 text-emerald-400 text-xs font-bold">No data found</div>
                    ) : (
                        equifaxList.map((lender) => (
                            <LiquidGlassCard key={lender.id} className="!p-4 bg-white/60 hover:bg-white hover:scale-[1.02] transition-all cursor-pointer border-emerald-100 group">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{getName(lender)}</h4>
                                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full whitespace-nowrap">{getType(lender)}</span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">{getNote(lender)}</p>
                            </LiquidGlassCard>
                        ))
                    )}
                </div>
            </div>

            {/* TRANSUNION COLUMN */}
            <div className="flex flex-col h-full bg-purple-50/30 rounded-[2.5rem] border border-purple-100 overflow-hidden">
                <div className="p-6 bg-purple-100/50 border-b border-purple-200/50 backdrop-blur-md sticky top-0 z-10">
                    <h3 className="text-lg font-black text-purple-700 uppercase tracking-widest text-center">TransUnion</h3>
                    <p className="text-xs text-purple-600 text-center font-bold mt-1">Fintechs & Aggressive Lenders</p>
                    <div className="mt-2 text-center">
                        <span className="text-[10px] font-bold bg-white/60 text-purple-800 px-2 py-1 rounded-full">{transUnionList.length} Lenders</span>
                    </div>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                    {loading ? (
                        <div className="text-center py-10 text-purple-400/50"><Loader2 className="animate-spin mx-auto" /></div>
                    ) : transUnionList.length === 0 ? (
                        <div className="text-center py-10 text-purple-400 text-xs font-bold">No data found</div>
                    ) : (
                        transUnionList.map((lender) => (
                            <LiquidGlassCard key={lender.id} className="!p-4 bg-white/60 hover:bg-white hover:scale-[1.02] transition-all cursor-pointer border-purple-100 group">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">{getName(lender)}</h4>
                                    <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full whitespace-nowrap">{getType(lender)}</span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">{getNote(lender)}</p>
                            </LiquidGlassCard>
                        ))
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};