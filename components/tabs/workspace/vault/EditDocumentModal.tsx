import React, { useState } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { X, Save, Trash2, FileText, Link as LinkIcon } from 'lucide-react';
import { ClientDocument } from '@/types';

interface EditDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ClientDocument;
  onSave: (id: string, data: Partial<ClientDocument>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const EditDocumentModal: React.FC<EditDocumentModalProps> = ({ 
  isOpen, onClose, document, onSave, onDelete 
}) => {
  const [formData, setFormData] = useState({
    name: document.name,
    category: document.category || 'Other',
    type: document.type || 'Other',
    url: document.url || '#'
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setIsSaving(true);
    await onSave(document.id, formData);
    setIsSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    if (confirm('Permanently delete this document?')) {
        await onDelete(document.id);
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <LiquidGlassCard className="w-full max-w-md relative z-10 !p-0 overflow-hidden shadow-2xl animate-fade-in-up flex flex-col">
        <div className="p-4 border-b border-white/40 bg-white/50 backdrop-blur-md flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                    <FileText size={16} />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Edit Document</h3>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <X size={18} />
            </button>
        </div>

        <div className="p-6 space-y-5 bg-slate-50/50">
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Document Name</label>
                <input 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    autoFocus
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category</label>
                    <select 
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value as any})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                    >
                        <option>Consulting</option>
                        <option>Restoration</option>
                        <option>Funding</option>
                        <option>Other</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Type</label>
                    <select 
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as any})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                    >
                        <option>ID</option>
                        <option>SSN</option>
                        <option>Utility</option>
                        <option>Report</option>
                        <option>Contract</option>
                        <option>Other</option>
                    </select>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">File URL</label>
                <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                        value={formData.url}
                        onChange={e => setFormData({...formData, url: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        placeholder="https://..."
                    />
                </div>
                {formData.url === '#' && (
                    <p className="text-[10px] text-orange-500 font-bold px-1">⚠️ This is a placeholder. Upload a real file or paste a link.</p>
                )}
            </div>

            <div className="flex gap-3 pt-2">
                <button 
                    onClick={handleDelete} 
                    className="p-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors shadow-sm"
                    title="Delete Document"
                >
                    <Trash2 size={18} />
                </button>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving} 
                    className="flex-1 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
      </LiquidGlassCard>
    </div>
  );
};