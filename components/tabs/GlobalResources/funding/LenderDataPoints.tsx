import React, { useState, useEffect } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { Search, ArrowLeft, Plus, Building2, ChevronDown, ChevronUp, ExternalLink, Zap, Star, ShieldCheck, Database, Loader2 } from 'lucide-react';
import { db } from '@/services/firebase';
import { collection, query, orderBy, onSnapshot, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { AddBankModal } from './AddBankModal';
import { EditGlobalBankModal } from './EditGlobalBankModal';

interface LenderDataPointsProps {
  onBack: () => void;
}

// Updated Interface to match your Firestore Schema exactly
interface Lender {
  id: string;
  institution_name?: string;
  name?: string; // Fallback
  institution_type?: string;
  type?: string; // Fallback
  tier: string;
  minScore: string | number; // Handle "680" string or 680 number
  maxApproval: string;
  bureaus: {
    experian: boolean;
    transUnion: boolean; // CamelCase matches your DB
    equifax: boolean;
  };
  is_soft_pull: boolean;
  is_winner: boolean;
  membership_notes: string;
  notes: string;
  geographic_states?: string[];
  website_url?: string;
}

// SEED DATA: Updated to write to funding_sources if needed
const SEED_LENDERS = [
    {
        institution_name: 'Chase Bank',
        institution_type: 'Bank',
        tier: 'Tier 1',
        minScore: "680",
        maxApproval: '$50,000',
        bureaus: { experian: true, transUnion: false, equifax: false },
        is_soft_pull: false,
        is_winner: true,
        membership_notes: 'Must open checking account first.',
        notes: 'Strict 5/24 rule applies (cannot have opened 5 personal cards in last 24 months).',
        website_url: 'https://chase.com'
    },
    {
        institution_name: 'Navy Federal',
        institution_type: 'Credit Union',
        tier: 'Tier 2',
        minScore: "640",
        maxApproval: '$80,000',
        bureaus: { experian: false, transUnion: true, equifax: true },
        is_soft_pull: false,
        is_winner: true,
        membership_notes: 'Requires military affiliation or family member.',
        notes: 'High limit funding. Relationship matters more than score.',
        website_url: 'https://navyfederal.org'
    }
];

export const LenderDataPoints: React.FC<LenderDataPointsProps> = ({ onBack }) => {
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLender, setEditingLender] = useState<Lender | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Filters
  const [filterBureau, setFilterBureau] = useState<string | null>(null);
  const [filterSoftPull, setFilterSoftPull] = useState(false);
  const [filterTier1, setFilterTier1] = useState(false);

  // Real-time Data
  useEffect(() => {
    // CORRECT PATH: targeting 'funding_sources' collection
    const q = query(collection(db, 'funding_sources'), orderBy('institution_name', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lender));
        setLenders(data);
        setLoading(false);
    }, (error) => {
        console.error("Firestore Error:", error);
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
        const batch = writeBatch(db);
        SEED_LENDERS.forEach((lender) => {
            const docRef = doc(collection(db, 'funding_sources'));
            batch.set(docRef, {
                ...lender,
                geographic_states: ['National'],
                createdAt: serverTimestamp()
            });
        });
        await batch.commit();
    } catch (e) {
        console.error("Error seeding database:", e);
    } finally {
        setIsSeeding(false);
    }
  };

  const filteredLenders = lenders.filter(l => {
      // Robust Name Check (Handle institution_name OR name)
      const name = l.institution_name || l.name || '';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Bureau Filter Logic
      const matchesBureau = filterBureau ? (() => {
          if (!l.bureaus) return false;
          const keyMap: Record<string, keyof typeof l.bureaus> = {
              'Experian': 'experian',
              'Equifax': 'equifax',
              'TransUnion': 'transUnion'
          };
          return l.bureaus[keyMap[filterBureau]] === true;
      })() : true;

      const matchesSoft = filterSoftPull ? l.is_soft_pull : true;
      const matchesTier = filterTier1 ? l.tier === 'Tier 1' : true;
      
      return matchesSearch && matchesBureau && matchesSoft && matchesTier;
  });

  const toggleExpand = (id: string) => {
      setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 h-full flex flex-col">
        <AddBankModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
        {editingLender && (
            <EditGlobalBankModal 
                isOpen={!!editingLender} 
                onClose={() => setEditingLender(null)} 
                lender={editingLender} 
            />
        )}

        {/* Header & Controls */}
        <div className="flex flex-col gap-6 flex-shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-sm transition-all hover:scale-105 active:scale-95"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Lender Intelligence</h2>
                        <p className="text-slate-500 font-medium">Global underwriting rules & approval criteria.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative group flex-1 md:flex-none">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder={`Search ${lenders.length} banks...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-80 bg-white border border-slate-200 rounded-full py-3.5 pl-12 pr-6 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all"
                        />
                    </div>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="h-12 w-12 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
                        title="Add Bank"
                    >
                        <Plus size={24} />
                    </button>
                </div>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                <button
                    onClick={() => setFilterSoftPull(!filterSoftPull)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-2
                        ${filterSoftPull ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}
                    `}
                >
                    <Zap size={14} fill={filterSoftPull ? "currentColor" : "none"} /> Soft Pull Only
                </button>
                <button
                    onClick={() => setFilterTier1(!filterTier1)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-2
                        ${filterTier1 ? 'bg-yellow-400 text-slate-900 border-yellow-400 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-yellow-400'}
                    `}
                >
                    <Star size={14} fill={filterTier1 ? "currentColor" : "none"} /> Tier 1 Only
                </button>
                <div className="w-px h-8 bg-slate-300 mx-1"></div>
                {['Experian', 'Equifax', 'TransUnion'].map(b => (
                    <button
                        key={b}
                        onClick={() => setFilterBureau(filterBureau === b ? null : b)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap
                            ${filterBureau === b 
                                ? b === 'Experian' ? 'bg-blue-100 text-blue-700 border-blue-300' 
                                : b === 'Equifax' ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                : 'bg-purple-100 text-purple-700 border-purple-300'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }
                        `}
                    >
                        {b}
                    </button>
                ))}
            </div>
        </div>

        {/* Master Intelligence List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 pb-10">
            <div className="min-w-[800px] space-y-3">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-4 px-6 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <div className="col-span-4">Institution</div>
                    <div className="col-span-2 text-center">Tier</div>
                    <div className="col-span-2 text-center">Score</div>
                    <div className="col-span-2 text-center">Bureaus</div>
                    <div className="col-span-2 text-right">Flags</div>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-slate-400 font-bold">Loading Intelligence...</div>
                ) : lenders.length === 0 ? (
                    /* EMPTY STATE */
                    <div className="flex flex-col items-center justify-center py-16 bg-white/40 rounded-[2.5rem] border border-dashed border-slate-300 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                            <Database size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Database is Empty</h3>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
                            Connect your Firestore "funding_sources" collection.
                        </p>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setIsAddModalOpen(true)}
                                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-full font-bold text-xs hover:bg-slate-50 transition-colors"
                            >
                                Add First Bank
                            </button>
                            <button 
                                onClick={handleSeedDatabase}
                                disabled={isSeeding}
                                className="px-6 py-2.5 bg-slate-900 text-white rounded-full font-bold text-xs shadow-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
                            >
                                {isSeeding ? <Loader2 className="animate-spin" size={14} /> : <Database size={14} />}
                                Initialize Templates
                            </button>
                        </div>
                    </div>
                ) : filteredLenders.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-medium bg-white/40 rounded-3xl border border-dashed border-slate-300">
                        No banks found matching your filters.
                    </div>
                ) : (
                    filteredLenders.map(lender => (
                        <div key={lender.id} className="group">
                            <LiquidGlassCard 
                                onClick={() => toggleExpand(lender.id)}
                                className={`!p-0 transition-all duration-300 overflow-hidden cursor-pointer hover:bg-white border-white/60
                                    ${expandedId === lender.id ? 'bg-white ring-2 ring-blue-500/20 shadow-xl scale-[1.01] z-10' : 'bg-white/60'}
                                `}
                            >
                                {/* Main Row */}
                                <div className="grid grid-cols-12 gap-4 p-5 items-center">
                                    {/* Identity */}
                                    <div className="col-span-4 flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 shadow-sm
                                            ${(lender.institution_type || lender.type) === 'Credit Union' ? 'bg-emerald-50 text-emerald-600' : 
                                              (lender.institution_type || lender.type) === 'Fintech' ? 'bg-purple-50 text-purple-600' :
                                              'bg-blue-50 text-blue-600'}
                                        `}>
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-sm">
                                                {lender.institution_name || lender.name || 'Unknown Bank'}
                                            </h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                                                {lender.institution_type || lender.type || 'Bank'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Tier */}
                                    <div className="col-span-2 flex justify-center">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase
                                            ${lender.tier === 'Tier 1' ? 'bg-slate-900 text-white' : 
                                              lender.tier === 'Tier 2' ? 'bg-slate-200 text-slate-600' :
                                              'bg-orange-100 text-orange-700'}
                                        `}>
                                            {lender.tier}
                                        </span>
                                    </div>

                                    {/* Target Score */}
                                    <div className="col-span-2 text-center">
                                        <p className="font-bold text-slate-700 text-sm">{lender.minScore}+</p>
                                        {lender.maxApproval && <p className="text-[10px] text-slate-400">{lender.maxApproval}</p>}
                                    </div>

                                    {/* Bureau Matrix */}
                                    <div className="col-span-2 flex justify-center gap-1.5">
                                        <div title="Experian" className={`w-3 h-3 rounded-full ${lender.bureaus?.experian ? 'bg-blue-500 shadow-sm shadow-blue-500/50' : 'bg-slate-200'}`}></div>
                                        <div title="Equifax" className={`w-3 h-3 rounded-full ${lender.bureaus?.equifax ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-200'}`}></div>
                                        <div title="TransUnion" className={`w-3 h-3 rounded-full ${lender.bureaus?.transUnion ? 'bg-purple-500 shadow-sm shadow-purple-500/50' : 'bg-slate-200'}`}></div>
                                    </div>

                                    {/* Flags & Expand */}
                                    <div className="col-span-2 flex justify-end items-center gap-3">
                                        {lender.is_winner && <Star size={16} className="text-yellow-400 fill-yellow-400" />}
                                        {lender.is_soft_pull && <Zap size={16} className="text-blue-500 fill-blue-500" />}
                                        <div className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                                            {expandedId === lender.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedId === lender.id && (
                                    <div className="px-5 pb-5 pt-0 animate-fade-in">
                                        <div className="pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Strategy Notes</h4>
                                                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                                                    {lender.notes || "No strategy notes available."}
                                                </div>
                                                {lender.membership_notes && (
                                                    <div className="p-4 bg-blue-50/30 rounded-2xl border border-blue-100 text-xs text-blue-700 leading-relaxed">
                                                        <span className="font-bold block mb-1">Membership Req:</span>
                                                        {lender.membership_notes}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-4">
                                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Quick Actions</h4>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {lender.website_url && (
                                                        <a 
                                                            href={lender.website_url} target="_blank" rel="noreferrer"
                                                            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
                                                        >
                                                            <ExternalLink size={14} /> Official Site
                                                        </a>
                                                    )}
                                                    <button 
                                                        onClick={() => setEditingLender(lender)}
                                                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                                                    >
                                                        <ShieldCheck size={14} /> Edit Bank Profile
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </LiquidGlassCard>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
  );
};