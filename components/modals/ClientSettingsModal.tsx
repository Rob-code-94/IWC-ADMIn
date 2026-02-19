import React, { useState, useEffect } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { Client } from '@/types';
import { X, Eye, EyeOff, Save, Trash2, AlertTriangle, User, MapPin, Phone, Calendar, Fingerprint } from 'lucide-react';

interface ClientSettingsModalProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Client>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const ClientSettingsModal: React.FC<ClientSettingsModalProps> = ({ 
  client, 
  isOpen, 
  onClose, 
  onUpdate,
  onDelete
}) => {
  // Identity State
  const [firstName, setFirstName] = useState(client.firstName || '');
  const [lastName, setLastName] = useState(client.lastName || '');
  const [phone, setPhone] = useState(client.phone || '');
  const [address, setAddress] = useState(client.address || '');
  const [dob, setDob] = useState(client.dob || '');
  const [ssn, setSsn] = useState(client.ssn || '');

  // Account State
  const [status, setStatus] = useState<Client['status']>(client.status);
  const [email, setEmail] = useState(client.email || '');
  const [password, setPassword] = useState(client.password || '');
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset state when client changes or modal opens
  useEffect(() => {
    if (isOpen) {
        setFirstName(client.firstName || '');
        setLastName(client.lastName || '');
        setPhone(client.phone || '');
        setAddress(client.address || '');
        setDob(client.dob || '');
        setSsn(client.ssn || '');
        setStatus(client.status);
        setEmail(client.email || '');
        setPassword(client.password || '');
    }
  }, [client, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(client.id, {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        phone,
        address,
        dob,
        ssn,
        status,
        email,
        password
      });
      onClose();
    } catch (e) {
      console.error("Failed to update client", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(client.id);
      // Parent handles closing/redirection
    } catch (e) {
      console.error("Failed to delete client", e);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Frosted Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <LiquidGlassCard className="relative w-full max-w-xl mx-4 z-10 !p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/40 bg-white/50 backdrop-blur-md">
          <h2 className="text-xl font-bold text-slate-900">Edit Client Profile</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar bg-slate-50/50">
          
          {/* Status Segment */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Account Status</label>
            <div className="flex p-1 bg-slate-100/80 rounded-2xl border border-slate-200">
              {(['Active', 'Lead', 'Archived'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all duration-300
                    ${status === s 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'}
                  `}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Personal Identity Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                <User size={14} /> Personal Identity
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <input 
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First Name"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
                <div className="space-y-1">
                    <input 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last Name"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
            </div>

            <div className="space-y-1 relative">
                <MapPin size={16} className="absolute left-3 top-3.5 text-slate-400" />
                <input 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Full Address"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 space-y-1 relative">
                    <Calendar size={16} className="absolute left-3 top-3.5 text-slate-400" />
                    <input 
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        placeholder="DOB"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
                <div className="col-span-1 space-y-1 relative">
                    <Fingerprint size={16} className="absolute left-3 top-3.5 text-slate-400" />
                    <input 
                        value={ssn}
                        onChange={(e) => setSsn(e.target.value)}
                        placeholder="SSN (L4)"
                        maxLength={4}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
                <div className="col-span-1 space-y-1 relative">
                    <Phone size={16} className="absolute left-3 top-3.5 text-slate-400" />
                    <input 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Phone"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
            </div>
          </div>

          {/* Credentials Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Portal Credentials</h3>
            
            <div className="space-y-1">
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Client Email"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Client Password"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 pr-12"
              />
              <button 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          {!showDeleteConfirm ? (
            <div className="pt-6 border-t border-slate-200/50 flex justify-between items-center">
               <button 
                 onClick={() => setShowDeleteConfirm(true)}
                 className="text-red-500 hover:text-red-600 text-sm font-semibold flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
               >
                 <Trash2 size={16} /> Delete Client
               </button>

               <button 
                 onClick={handleSave}
                 disabled={isSaving}
                 className="bg-[#007AFF] text-white px-8 py-3 rounded-full font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-600 active:scale-95 transition-all flex items-center gap-2"
               >
                 {isSaving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
               </button>
            </div>
          ) : (
            <div className="pt-6 border-t border-slate-200/50">
              <div className="bg-red-50 rounded-2xl p-4 border border-red-100 mb-4">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <AlertTriangle size={18} />
                  <span className="font-bold text-sm">Permanent Action</span>
                </div>
                <p className="text-xs text-red-600/80 leading-relaxed">
                  Are you sure you want to delete {firstName}? This action cannot be undone and all data (tasks, scores, documents) will be lost.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-slate-500 font-medium text-sm hover:bg-slate-100 rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm rounded-full shadow-lg shadow-red-500/20 transition-all active:scale-95"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </LiquidGlassCard>
    </div>
  );
};