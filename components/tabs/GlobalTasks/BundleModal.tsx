import React, { useState, useEffect } from 'react';
import { db } from '@/services/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { X, Save, Trash2, Layers, CheckCircle2 } from 'lucide-react';

interface BundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: any;
  availableTemplates: any[];
}

export const BundleModal: React.FC<BundleModalProps> = ({ isOpen, onClose, bundle, availableTemplates }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'Restoration',
    template_ids: [] as string[]
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (bundle) {
      setFormData({
        title: bundle.title || '',
        category: bundle.category || 'Restoration',
        template_ids: bundle.template_ids || []
      });
    } else {
      setFormData({ title: '', category: 'Restoration', template_ids: [] });
    }
  }, [bundle, isOpen]);

  if (!isOpen) return null;

  const toggleTemplate = (id: string) => {
    setFormData(prev => {
      const next = [...prev.template_ids];
      const idx = next.indexOf(id);
      if (idx > -1) next.splice(idx, 1);
      else next.push(id);
      return { ...prev, template_ids: next };
    });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    setIsSaving(true);
    try {
      if (bundle?.id) {
        await updateDoc(doc(db, 'bundle_templates', bundle.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'bundle_templates'), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!bundle?.id || !confirm('Delete this workflow bundle?')) return;
    await deleteDoc(doc(db, 'bundle_templates', bundle.id));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-md" onClick={onClose} />
      
      <LiquidGlassCard className="w-full max-w-2xl relative z-10 !p-0 overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-white/40 bg-white/50 backdrop-blur-md flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Layers size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-xl">{bundle ? 'Edit Bundle' : 'Create Workflow Bundle'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 bg-slate-50/30 overflow-y-auto flex-1 custom-scrollbar">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Bundle Title</label>
              <input 
                autoFocus
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g. Standard Onboarding..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/10 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 outline-none"
              >
                <option>Restoration</option>
                <option>Funding</option>
                <option>Onboarding</option>
                <option>General</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Select SOPs to Include ({formData.template_ids.length})</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
               {availableTemplates.map(t => {
                 const isSelected = formData.template_ids.includes(t.id);
                 return (
                   <button 
                    key={t.id}
                    onClick={() => toggleTemplate(t.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                      ${isSelected 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]' 
                        : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200'}
                    `}
                   >
                     <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${isSelected ? 'bg-white text-blue-600' : 'bg-slate-50 border-slate-200'}`}>
                       {isSelected && <CheckCircle2 size={12} strokeWidth={3} />}
                     </div>
                     <span className="text-xs font-bold truncate">{t.title}</span>
                   </button>
                 );
               })}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/40 bg-white/50 backdrop-blur-md flex justify-between items-center">
            {bundle && (
              <button 
                onClick={handleDelete}
                className="px-4 py-2 text-red-500 font-bold text-xs hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} /> Delete Bundle
              </button>
            )}
            <button 
              onClick={handleSave}
              disabled={isSaving || !formData.title.trim()}
              className="ml-auto px-10 py-3.5 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {isSaving ? 'Syncing...' : 'Save Workflow'}
            </button>
        </div>
      </LiquidGlassCard>
    </div>
  );
};