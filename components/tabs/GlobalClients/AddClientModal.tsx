import React, { useState } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { X, UserPlus, Fingerprint, MapPin, Mail, Phone, Calendar } from 'lucide-react';
import { addClient } from '@/services/firebase';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    dob: '',
    ssn: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.email) return; // Basic validation
    
    setIsSaving(true);
    try {
      await addClient({
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`
      });
      onClose();
      // Reset handled by component unmount or state reset if kept alive
      setFormData({
        firstName: '', lastName: '', email: '', phone: '', address: '', dob: '', ssn: ''
      });
    } catch (e) {
      console.error("Failed to create client:", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* iOS Blur Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <LiquidGlassCard className="w-full max-w-2xl relative z-10 !p-0 overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/40 bg-white/50 backdrop-blur-md flex justify-between items-center">
             <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shadow-sm">
                     <UserPlus size={20} strokeWidth={2.5} />
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-900 text-xl tracking-tight">New Client Profile</h3>
                    <p className="text-xs text-slate-500 font-medium">Initiate onboarding sequence.</p>
                 </div>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                 <X size={20} />
             </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-8 space-y-8 bg-slate-50/50 overflow-y-auto custom-scrollbar">
             
             {/* 1. Identity Chamber */}
             <div className="space-y-4">
                 <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <Fingerprint size={14} /> Personal Identity
                 </h4>
                 
                 {/* Name Row */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">First Name</label>
                        <input 
                            autoFocus
                            value={formData.firstName}
                            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                            placeholder="e.g. Brian"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all focus:border-blue-400"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Last Name</label>
                        <input 
                            value={formData.lastName}
                            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                            placeholder="e.g. Burt"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all focus:border-blue-400"
                        />
                    </div>
                 </div>

                 {/* Contact Row */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                            <Mail size={10} /> Email Address
                        </label>
                        <input 
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            placeholder="client@email.com"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                            <Phone size={10} /> Phone Number
                        </label>
                        <input 
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            placeholder="(555) 000-0000"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        />
                    </div>
                 </div>

                 {/* Sensitive Data Row */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                            <Calendar size={10} /> Date of Birth
                        </label>
                        <input 
                            value={formData.dob}
                            onChange={(e) => setFormData({...formData, dob: e.target.value})}
                            placeholder="MM/DD/YYYY"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">SSN (Last 4)</label>
                        <input 
                            maxLength={4}
                            value={formData.ssn}
                            onChange={(e) => setFormData({...formData, ssn: e.target.value})}
                            placeholder="••••"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all tracking-widest"
                        />
                    </div>
                 </div>
             </div>

             {/* 2. Physical Location */}
             <div className="space-y-2">
                 <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <MapPin size={14} /> Physical Address
                 </h4>
                 <input 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Full Street Address, City, State ZIP"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                 />
             </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/40 bg-white/50 backdrop-blur-md flex justify-end">
             <button 
                onClick={handleSubmit}
                disabled={isSaving || !formData.firstName || !formData.email}
                className="px-8 py-3.5 bg-[#007AFF] text-white rounded-full font-bold shadow-xl shadow-blue-500/30 hover:bg-blue-600 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
             >
                {isSaving ? 'Creating...' : 'Create Client'}
                <UserPlus size={18} />
             </button>
        </div>

      </LiquidGlassCard>
    </div>
  );
};