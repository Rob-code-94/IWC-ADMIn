import React, { useState, useEffect } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { X, Save, Building2, Globe, ShieldCheck, Zap, Trash2, Loader2 } from 'lucide-react';
import { VoiceTextArea } from '@/components/ui/VoiceTextArea';
import { db } from '@/services/firebase';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

interface EditGlobalBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  lender: any;
}

export const EditGlobalBankModal: React.FC<EditGlobalBankModalProps> = ({ isOpen, onClose, lender }) => {
  const [isSaving, setIsSaving] = useState(false);
  
  // FORM STATE - Initialize with lender data
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

  useEffect(() => {
      if (lender) {
          setFormData({
              institution_name: lender.institution_name || lender.name || '',
              website_url: lender.website_url || '',
              institution_type: lender.institution_type || lender.type || 'Bank',
              tier: lender.tier || 'Tier 1',
              minScore: lender.minScore || '',
              maxApproval: lender.maxApproval || '',
              is_soft_pull: lender.is_soft_pull || false,
              is_winner: lender.is_winner || false,
              membership_notes: lender.membership_notes || '',
              notes: lender.notes || '',
              bureaus: {
                  experian: lender.bureaus?.experian || false,
                  equifax: lender.bureaus?.equifax || false,
                  transUnion: lender.bureaus?.transUnion || false
              }
          });
      }
  }, [lender, isOpen]);

  if (!isOpen || !lender) return null;

  const handleBureauToggle = (bureau: 'experian' | 'equifax' | 'transUnion') => {
      setFormData(prev => ({
          ...prev,
          bureaus: { ...prev.bureaus, [bureau]: !prev.bureaus[bureau] }
      }));
  };

  const handleUpdate = async () => {
      if (!formData.institution_name) return;
      setIsSaving(true);
      try {
          const docRef = doc(db, 'funding_sources', lender.id);
          await updateDoc(docRef, {
              ...formData,
              // Update duplicate fields
              name: formData.institution_name,
              type: formData.institution_type,
              minScore: formData.minScore, 
              updatedAt: serverTimestamp()
          });
          onClose();
      } catch (e) {
          console.error("Error updating lender:", e);
      } finally {
          setIsSaving(false);
      }
  };

  const handleDelete = async () => {
      if (!confirm("Are you sure you want to delete this lender from the global database?")) return;
      setIsSaving(true);
      try {
          await deleteDoc(doc(db, 'funding_sources', lender.id));
          onClose();
      } catch (e) {
          console.error("Error deleting lender:", e);
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <LiquidGlassCard className="w-full max-w-2xl relative z-10 !p-0 overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/40 bg-white/50 backdrop-blur-md flex justify-between items-center flex-shrink-0">
             <div className="flex items-center gap-3">
                 <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg">
                     <Building2 size={22} />
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-900 text-xl tracking-tight">Edit Lender Intelligence</h3>
                    <p className="text-xs text-slate-500 font-medium">Global Resource Database</p>
                 </div>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
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
                            value={formData.institution_name}
                            onChange={(e) => setFormData({...formData, institution_name: e.target.value})}
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
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Est. Max Approval</label>
                        <input 
                            value={formData.maxApproval}
                            onChange={(e) => setFormData({...formData, maxApproval: e.target.value})}
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
                     <label className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-300 transition-all flex-1">
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
                        <VoiceTextArea 
                            value={formData.membership_notes}
                            onChange={(e) => setFormData({...formData, membership_notes: e.target.value})}
                            rows={2}
                            className="bg-white border-slate-200"
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">General Notes</label>
                        <VoiceTextArea 
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            rows={2}
                            className="bg-white border-slate-200"
                        />
                     </div>
                 </div>
             </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/40 bg-white/50 backdrop-blur-md flex justify-between items-center flex-shrink-0">
             <button 
                onClick={handleDelete}
                className="px-4 py-2 text-red-500 font-bold text-xs hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors"
             >
                <Trash2 size={16} /> Delete Bank
             </button>
             <button 
                onClick={handleUpdate}
                disabled={isSaving || !formData.institution_name}
                className="px-8 py-3 bg-slate-900 text-white rounded-full font-bold shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
             >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Save Changes</>}
             </button>
        </div>
      </LiquidGlassCard>
    </div>
  );
};