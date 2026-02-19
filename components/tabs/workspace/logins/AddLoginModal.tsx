import React, { useState } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { X, Save, Lock } from 'lucide-react';
import { VoiceTextArea } from '@/components/ui/VoiceTextArea';
import { LoginCredential } from '@/types';
import { db } from '@/services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface AddLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
}

export const AddLoginModal: React.FC<AddLoginModalProps> = ({ isOpen, onClose, clientId }) => {
  const [formData, setFormData] = useState<Partial<LoginCredential>>({
      category: 'Credit Monitoring'
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!formData.serviceName || !formData.username || !formData.password) return;

    setIsSaving(true);
    try {
        await addDoc(collection(db, 'clients', clientId, 'logins'), {
            ...formData,
            updatedAt: serverTimestamp()
        });
        setFormData({ category: 'Credit Monitoring' });
        onClose();
    } catch (e) {
        console.error("Error adding login:", e);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Modal */}
      <LiquidGlassCard className="w-full max-w-lg relative z-10 !p-0 overflow-hidden shadow-2xl animate-fade-in-up">
        <div className="p-6 border-b border-white/40 bg-white/50 backdrop-blur-md flex justify-between items-center">
             <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                     <Lock size={20} />
                 </div>
                 <h3 className="font-bold text-slate-900 text-xl">Add New Login</h3>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                 <X size={20} />
             </button>
        </div>

        <div className="p-8 space-y-6 bg-slate-50/50">
             {/* Fields */}
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Service Name</label>
                        <input 
                            autoFocus
                            placeholder="e.g. IdentityIQ"
                            value={formData.serviceName || ''}
                            onChange={(e) => setFormData({...formData, serviceName: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category</label>
                        <select 
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        >
                            <option>Credit Monitoring</option>
                            <option>Banking & Finance</option>
                            <option>Utility / Misc</option>
                            <option>Other</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Username / Email</label>
                    <input 
                        value={formData.username || ''}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Password</label>
                    <input 
                        type="text"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Website URL</label>
                    <input 
                        placeholder="https://"
                        value={formData.websiteUrl || ''}
                        onChange={(e) => setFormData({...formData, websiteUrl: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Security Notes</label>
                    <VoiceTextArea 
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        rows={3} 
                        className="bg-white border-slate-200"
                        placeholder="Dictate security questions or PINs..."
                    />
                </div>
             </div>

             <button 
                onClick={handleSubmit}
                disabled={isSaving || !formData.serviceName || !formData.username || !formData.password}
                className="w-full py-4 bg-[#007AFF] text-white rounded-[1.5rem] font-bold text-lg shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
             >
                <Save size={20} />
                {isSaving ? 'Securing...' : 'Save Credential'}
             </button>
        </div>
      </LiquidGlassCard>
    </div>
  );
};