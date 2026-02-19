import React, { useState, useEffect } from 'react';
import { db } from '@/services/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { X, Save, Trash2, Play, Link as LinkIcon } from 'lucide-react';

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: any;
}

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({ isOpen, onClose, template }) => {
  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    category: 'General',
    priority: 'Medium',
    websiteLink: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData({
        title: template.title || '',
        shortDescription: template.shortDescription || '',
        category: template.category || 'General',
        priority: template.priority || 'Medium',
        websiteLink: template.websiteLink || ''
      });
    } else {
      setFormData({ 
        title: '', 
        shortDescription: '', 
        category: 'General', 
        priority: 'Medium', 
        websiteLink: '' 
      });
    }
  }, [template, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    setIsSaving(true);
    try {
      const dataToSave = {
        title: formData.title,
        shortDescription: formData.shortDescription,
        category: formData.category,
        priority: formData.priority,
        websiteLink: formData.websiteLink,
        updatedAt: serverTimestamp()
      };

      if (template?.id) {
        await updateDoc(doc(db, 'task_templates', template.id), dataToSave);
      } else {
        await addDoc(collection(db, 'task_templates'), {
          ...dataToSave,
          createdAt: serverTimestamp()
        });
      }
      onClose();
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!template?.id || !confirm('Delete this SOP template?')) return;
    try {
      await deleteDoc(doc(db, 'task_templates', template.id));
      onClose();
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-md" onClick={onClose} />
      
      <LiquidGlassCard className="w-full max-w-lg relative z-10 !p-0 overflow-hidden shadow-2xl animate-fade-in-up">
        <div className="p-6 border-b border-white/40 bg-white/50 backdrop-blur-md flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Play size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-xl">{template ? 'Edit SOP' : 'New SOP Template'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 bg-slate-50/30">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Task Title</label>
              <input 
                autoFocus
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g. Verify Primary Address..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/10 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Description</label>
              <input 
                value={formData.shortDescription}
                onChange={(e) => setFormData({...formData, shortDescription: e.target.value})}
                placeholder="Brief summary of this SOP..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/10 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 outline-none"
                >
                  <option>General</option>
                  <option>Restoration</option>
                  <option>Funding</option>
                  <option>Onboarding</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Priority</label>
                <select 
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 outline-none"
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
               <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Website Link</label>
               <div className="relative">
                   <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input 
                     value={formData.websiteLink}
                     onChange={(e) => setFormData({...formData, websiteLink: e.target.value})}
                     placeholder="https://example.com/resource"
                     className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/10 outline-none"
                   />
               </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            {template && (
              <button 
                onClick={handleDelete}
                className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                title="Delete Template"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button 
              onClick={handleSave}
              disabled={isSaving || !formData.title.trim()}
              className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      </LiquidGlassCard>
    </div>
  );
};