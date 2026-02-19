import React, { useState } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { X, Save, ShieldCheck, Zap, Star, Landmark, Database, Loader2 } from 'lucide-react';
import { db } from '@/services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface EditBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  lender: any;
}

export const EditBankModal: React.FC<EditBankModalProps> = ({ isOpen, onClose, clientId, lender }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [syncToGlobal, setSyncToGlobal] = useState(false); // DEFAULT FALSE for safety
  
  const [formData, setFormData] = useState({
      institution_name: lender.institution_name || lender.name || '',
      tier: lender.tier || 'Tier 1',
      minScore: lender.minScore || '',
      maxApproval: lender.maxApproval || '',
      is_soft_pull: lender.is_soft_pull || false,
      is_winner: lender.is_winner || false,
      notes: lender.notes || '',
      bureaus: {
          experian: lender.bureaus?.experian || false,
          equifax: lender.bureaus?.equifax || false,
          transUnion: lender.bureaus?.transUnion || false
      }
  });

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Update Client Instance
      const clientLenderRef = doc(db, 'clients', clientId, 'banking_relationships', lender.id);
      await setDoc(clientLenderRef, {
        ...formData,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 2. Conditional Global Update (Intelligent Database)
      if (syncToGlobal) {
        // Update global intelligence
        const globalLenderRef = doc(db, 'funding_sources', lender.id);
        await setDoc(globalLenderRef, {
          ...formData,
          name: formData.institution_name,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBureauToggle = (b: 'experian' | 'equifax' | 'transUnion') => {
    setFormData(prev => ({
        ...prev,
        bureaus: { ...prev.bureaus, [b]: !prev.bureaus[b] }
    }));
  };

  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <LiquidGlassCard className="w-full max-w-lg relative z-10 !p-0 overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/40 bg-white/50 backdrop-blur-md flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 text-white rounded-xl">
                    <ShieldCheck size={20} />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Adjust Intelligence</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="p-8 space-y-6 bg-slate-50/50 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Institution Name</label>
                    <input 
                        value={formData.institution_name}
                        onChange={e => setFormData({...formData, institution_name: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tier</label>
                        <select 
                            value={formData.tier}
                            onChange={e => setFormData({...formData, tier: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 outline-none"
                        >
                            <option>Tier 1</option>
                            <option>Tier 2</option>
                            <option>Tier 3</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Min Score</label>
                        <input 
                            value={formData.minScore}
                            onChange={e => setFormData({...formData, minScore: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Bureau Protocol</label>
                    <div className="flex gap-2">
                        {[
                            { id: 'experian', label: 'EXP', color: 'bg-blue-500' },
                            { id: 'equifax', label: 'EQ', color: 'bg-emerald-500' },
                            { id: 'transUnion', label: 'TU', color: 'bg-purple-500' }
                        ].map(b => (
                            <button
                                key={b.id}
                                onClick={() => handleBureauToggle(b.id as any)}
                                className={`flex-1 py-2.5 rounded-xl border text-[10px] font-black transition-all
                                    ${formData.bureaus[b.id as keyof typeof formData.bureaus] 
                                        ? `${b.color} text-white border-transparent shadow-sm` 
                                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}
                                `}
                            >
                                {b.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-4">
                     <label className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-300 transition-all flex-1">
                         <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                            checked={formData.is_soft_pull}
                            onChange={(e) => setFormData({...formData, is_soft_pull: e.target.checked})}
                         />
                         <span className="text-[10px] font-bold text-slate-700 uppercase">Soft Pull</span>
                     </label>
                     <label className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-yellow-300 transition-all flex-1">
                         <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded text-yellow-500 focus:ring-yellow-500"
                            checked={formData.is_winner}
                            onChange={(e) => setFormData({...formData, is_winner: e.target.checked})}
                         />
                         <span className="text-[10px] font-bold text-slate-700 uppercase">Winner</span>
                     </label>
                </div>

                {/* SYNC TOGGLE */}
                <div className="pt-4 border-t border-slate-200">
                    <label className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl cursor-pointer group transition-all hover:bg-blue-100/50">
                        <div className="mt-1">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-blue-200"
                                checked={syncToGlobal}
                                onChange={e => setSyncToGlobal(e.target.checked)}
                            />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                                <Database size={14} /> Update Global Intelligence
                            </p>
                            <p className="text-[10px] text-blue-700/70 font-medium leading-relaxed mt-0.5">
                                Apply these changes to the master database. This will affect all future client selections of this bank.
                            </p>
                        </div>
                    </label>
                </div>
            </div>

            <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-bold text-lg shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Save Changes</>}
            </button>
        </div>
      </LiquidGlassCard>
    </div>
  );
};