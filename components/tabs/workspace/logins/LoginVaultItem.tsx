import React, { useState } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { LoginCredential } from '@/types';
import { Eye, EyeOff, Copy, ExternalLink, Edit2, Trash2, Save, X, Lock, Check } from 'lucide-react';
import { VoiceTextArea } from '@/components/ui/VoiceTextArea';

interface LoginVaultItemProps {
  credential: LoginCredential;
  onUpdate: (id: string, data: Partial<LoginCredential>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const LoginVaultItem: React.FC<LoginVaultItemProps> = ({ credential, onUpdate, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Edit State
  const [formData, setFormData] = useState<Partial<LoginCredential>>({ ...credential });

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = async () => {
    await onUpdate(credential.id, formData);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <LiquidGlassCard className="bg-white/90 border-blue-200 shadow-xl space-y-4 relative">
        <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-slate-900">Edit Credential</h3>
            <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={18} /></button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Service Name</label>
                <input 
                    value={formData.serviceName}
                    onChange={(e) => setFormData({...formData, serviceName: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category</label>
                <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                >
                    <option>Credit Monitoring</option>
                    <option>Banking & Finance</option>
                    <option>Utility / Misc</option>
                    <option>Other</option>
                </select>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Username</label>
                <input 
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Password</label>
                <input 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                />
            </div>
            <div className="col-span-full space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Login URL</label>
                <input 
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({...formData, websiteUrl: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm text-slate-600 focus:ring-2 focus:ring-blue-500/20"
                />
            </div>
             <div className="col-span-full space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Security Notes</label>
                <VoiceTextArea 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={2}
                    placeholder="Security questions, PINs, etc."
                />
            </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <button onClick={() => onDelete(credential.id)} className="px-4 py-2 text-red-500 text-xs font-bold hover:bg-red-50 rounded-lg flex items-center gap-2 mr-auto">
                <Trash2 size={14} /> Delete
            </button>
            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2">
                <Save size={16} /> Save Changes
            </button>
        </div>
      </LiquidGlassCard>
    );
  }

  // View State
  return (
    <LiquidGlassCard className={`relative group transition-all duration-300 ${isExpanded ? 'bg-white/80 ring-2 ring-blue-500/10' : 'hover:bg-white/60'}`}>
        {/* Header (Always Visible) */}
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-slate-500
                    ${credential.category === 'Credit Monitoring' ? 'bg-purple-50 text-purple-600' :
                      credential.category === 'Banking & Finance' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-slate-100'}
                `}>
                    <Lock size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 text-lg">{credential.serviceName}</h3>
                    <p className="text-xs text-slate-500 font-medium">{credential.username}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase hidden md:inline-block
                     ${credential.category === 'Credit Monitoring' ? 'bg-purple-100 text-purple-700' :
                       credential.category === 'Banking & Finance' ? 'bg-emerald-100 text-emerald-700' :
                       'bg-slate-100 text-slate-500'}
                `}>
                    {credential.category}
                </span>
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); setIsExpanded(true); }}
                    className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                >
                    <Edit2 size={16} />
                </button>
            </div>
        </div>

        {/* Expanded Body */}
        {isExpanded && (
            <div className="mt-6 pt-6 border-t border-slate-200/50 space-y-4 animate-fade-in">
                
                {/* Credentials Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Username */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center group/field">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Username / Email</p>
                            <p className="text-sm font-bold text-slate-800 font-mono select-all">{credential.username}</p>
                        </div>
                        <button 
                            onClick={() => handleCopy(credential.username, 'user')}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            {copiedField === 'user' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        </button>
                    </div>

                    {/* Password */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center group/field">
                        <div className="flex-1 min-w-0 mr-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Password</p>
                            <p className="text-sm font-bold text-slate-800 font-mono truncate">
                                {showPassword ? credential.password : '••••••••••••'}
                            </p>
                        </div>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setShowPassword(!showPassword)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <button 
                                onClick={() => handleCopy(credential.password, 'pass')}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                {copiedField === 'pass' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Actions & Notes */}
                <div className="flex flex-col md:flex-row gap-4">
                    {credential.websiteUrl && (
                         <a 
                            href={credential.websiteUrl.startsWith('http') ? credential.websiteUrl : `https://${credential.websiteUrl}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-600 font-bold text-sm rounded-xl hover:bg-blue-100 transition-colors"
                        >
                            <ExternalLink size={16} /> Open Login Page
                        </a>
                    )}
                    
                    {credential.notes && (
                        <div className="flex-1 p-3 bg-yellow-50/50 border border-yellow-100 rounded-xl">
                            <p className="text-[10px] font-bold text-yellow-600 uppercase mb-1">Security Notes</p>
                            <p className="text-sm text-slate-700 italic">{credential.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        )}
    </LiquidGlassCard>
  );
};