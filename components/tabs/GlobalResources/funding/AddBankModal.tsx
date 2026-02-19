import React, { useState } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { X, Save, Building2, Globe, Zap } from 'lucide-react';
import { db } from '@/services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AddBankModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBankModal: React.FC<AddBankModalProps> = ({ isOpen, onClose }) => {
  const [isSaving, setIsSaving] = useState(false);
  
  // FORM STATE
  const [formData, setFormData] = useState({
      institution_name: '',
      website_url: '',
      institution_type: 'Bank',
      tier: 'Tier 1',
      minScore: '',
      maxApproval: '',
      is_soft_pull: false,
      is_winner: false,
      membership_notes: '',
      notes: '',
      bureaus: {
          experian: false,
          equifax: false,
          transUnion: false
      }
  });

  if (!isOpen) return null;

  const handleBureauToggle = (bureau: 'experian' | 'equifax' | 'transUnion') => {
      setFormData(prev => ({
          ...prev,
          bureaus: { ...prev.bureaus, [bureau]: !prev.bureaus[bureau] }
      }));
  };

  const handleSubmit = async () => {
      if (!formData.institution_name) return;
      setIsSaving(true);
      try {
          // Deterministic Slug Logic: "Chase Bank" -> "chase-bank"
          const docId = formData.institution_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const docRef = doc(db, 'funding_sources', docId);

          await setDoc(docRef, {
              ...formData,
              id: docId, // Explicitly save ID
              name: formData.institution_name,
              type: formData.institution_type,
              minScore: formData.minScore,
              geographic_states: ['National'], 
              createdAt: serverTimestamp()
          }, { merge: true });
          
          onClose();
          setFormData({
              institution_name: '',
              website_url: '',
              institution_type: 'Bank',
              tier: 'Tier 1',
              minScore: '',
              maxApproval: '',
              is_soft_pull: false,
              is_winner: false,
              membership_notes: '',
              notes: '',
              bureaus: { experian: false, equifax: false, transUnion: false }
          });
      } catch (e) {
          console.error("Error adding lender:", e);
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <LiquidGlassCard className="w-full max-w-2xl relative z-10 !p-0 overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/40 bg-white/50 backdrop-blur-md flex justify-between items-center flex-shrink-0">
             <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                     <Building2 size={20} />
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-900 text-xl">Add Global Lender</h3>
                    <p className="text-xs text-slate-500 font-medium">Expand the intelligence database.</p>
                 </div>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                 <X size={20} />
             </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-8 space-y-8 bg-slate-50/50 overflow-y-auto custom-scrollbar flex-1">
             
             {/* 1. Identity */}
             <div className="space-y-4">
                 <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Identity & Strategy</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 md:col-span-1 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Institution Name</label>
                        <input 
                            autoFocus
                            value={formData.institution_name}
                            onChange={(e) => setFormData({...formData, institution_name: e.target.value})}
                            placeholder="e.g. Skyla Credit Union"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-1">
                         <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Website URL</label>
                         <div className="relative">
                            <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                value={formData.website_url}
                                onChange={(e) => setFormData({...formData, website_url: e.target.value})}
                                placeholder="https://"
                                className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-9 pr-4 text-sm font-medium text-slate-600 focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                         </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Type</label>
                        <select 
                            value={formData.institution_type}
                            onChange={(e) => setFormData({...formData, institution_type: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 outline-none"
                        >
                            <option>Bank</option>
                            <option>Credit Union</option>
                            <option>Fintech</option>
                            <option>Commercial</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tier Classification</label>
                        <select 
                            value={formData.tier}
                            onChange={(e) => setFormData({...formData, tier: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 outline-none"
                        >
                            <option>Tier 1</option>
                            <option>Tier 2</option>
                            <option>Tier 3</option>
                            <option>Subprime</option>
                        </select>
                    </div>
                 </div>
             </div>

             {/* 2. Underwriting & Bureau Matrix */}
             <div className="space-y-4">
                 <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Underwriting Rules</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Min. Score</label>
                        <input 
                            type="text"
                            value={formData.minScore}
                            onChange={(e) => setFormData({...formData, minScore: e.target.value})}
                            placeholder="680"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Est. Max Approval</label>
                        <input 
                            value={formData.maxApproval}
                            onChange={(e) => setFormData({...formData, maxApproval: e.target.value})}
                            placeholder="$25,000"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                    </div>
                 </div>

                 {/* Bureau Matrix */}
                 <div className="bg-white p-4 rounded-xl border border-slate-200">
                     <label className="text-[10px] font-bold text-slate-400 uppercase mb-3 block">Primary Pull Source</label>
                     <div className="flex gap-4">
                         {[
                             { id: 'experian', label: 'Experian', color: 'bg-blue-500' },
                             { id: 'equifax', label: 'Equifax', color: 'bg-emerald-500' },
                             { id: 'transUnion', label: 'TransUnion', color: 'bg-purple-500' }
                         ].map((b) => (
                             <label key={b.id} className="flex items-center gap-2 cursor-pointer group">
                                 <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${formData.bureaus[b.id as keyof typeof formData.bureaus] ? `${b.color} border-transparent` : 'bg-white border-slate-300'}`}>
                                     <input 
                                        type="checkbox" 
                                        className="hidden" 
                                        checked={formData.bureaus[b.id as keyof typeof formData.bureaus]}
                                        onChange={() => handleBureauToggle(b.id as any)}
                                     />
                                     {formData.bureaus[b.id as keyof typeof formData.bureaus] && <Zap size={12} className="text-white" fill="currentColor" />}
                                 </div>
                                 <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">{b.label}</span>
                             </label>
                         ))}
                     </div>
                 </div>

                 {/* Flags */}
                 <div className="flex gap-4">
                     <label className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-blue-300 transition-all flex-1">
                         <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            checked={formData.is_soft_pull}
                            onChange={(e) => setFormData({...formData, is_soft_pull: e.target.checked})}
                         />
                         <span className="text-sm font-bold text-slate-700">Soft Pull Pre-Qual</span>
                     </label>
                     <label className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-yellow-300 transition-all flex-1">
                         <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded text-yellow-500 focus:ring-yellow-500"
                            checked={formData.is_winner}
                            onChange={(e) => setFormData({...formData, is_winner: e.target.checked})}
                         />
                         <span className="text-sm font-bold text-slate-700">Winner Strategy</span>
                     </label>
                 </div>
             </div>

             {/* 3. Insider Intelligence */}
             <div className="space-y-4">
                 <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Insider Intelligence</h4>
                 <div className="space-y-3">
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Membership / Geo Notes</label>
                        <textarea 
                            placeholder="e.g. Requires donation to 'San Diego Zoo'..."
                            value={formData.membership_notes}
                            onChange={(e) => setFormData({...formData, membership_notes: e.target.value})}
                            rows={2}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">General Notes</label>
                        <textarea 
                            placeholder="Strategy notes..."
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            rows={2}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                     </div>
                 </div>
             </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/40 bg-white/50 backdrop-blur-md flex justify-end flex-shrink-0">
             <button 
                onClick={handleSubmit}
                disabled={isSaving || !formData.institution_name}
                className="px-8 py-3 bg-slate-900 text-white rounded-full font-bold shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
             >
                <Save size={18} />
                {isSaving ? 'Saving...' : 'Save to Intelligence'}
             </button>
        </div>
      </LiquidGlassCard>
    </div>
  );
};