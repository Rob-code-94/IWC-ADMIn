import React, { useState, useEffect } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { User, ShieldCheck, Landmark, Briefcase, ChevronDown, ChevronUp, Edit2, Save, X, MapPin, Fingerprint, Calendar, DollarSign } from 'lucide-react';
import { subscribeToFundingProfile, updateFundingProfile } from '@/services/firebase';
import { Client } from '@/types';

interface FundingProfileCardProps {
  client: Client;
}

export const FundingProfileCard: React.FC<FundingProfileCardProps> = ({ client }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    identity: true,
    government: false,
    financial: true,
    employment: false
  });

  const [formData, setFormData] = useState<any>({
    fullLegalName: '',
    email: '',
    phone: '',
    address: '',
    fullSSN: '',
    dob: '',
    idNumber: '',
    idIssueDate: '',
    idExpirationDate: '',
    annualSalary: 0,
    monthlyRentPayment: 0,
    rentTenureMonths: 0,
    employerName: '',
    employmentTenureMonths: 0
  });

  useEffect(() => {
    if (!client.id) return;
    return subscribeToFundingProfile(client.id, (data) => {
      if (data) {
        setFormData(data);
      } else {
        // Hydrate from basic client info if profile doesn't exist
        setFormData(prev => ({
          ...prev,
          fullLegalName: client.name || `${client.firstName} ${client.lastName}`,
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          fullSSN: client.ssn || '',
          dob: client.dob || ''
        }));
      }
    });
  }, [client]);

  const toggleSection = (s: string) => setExpanded(prev => ({ ...prev, [s]: !prev[s] }));

  const handleSave = async () => {
    try {
      await updateFundingProfile(client.id, formData);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    }
  };

  const monthlyIncome = Math.round((Number(formData.annualSalary) || 0) / 12);

  const InputField = ({ label, name, type = "text", placeholder = "", icon: Icon }: any) => (
    <div className="space-y-1">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
        {Icon && <Icon size={10} className="opacity-60" />} {label}
      </label>
      {isEditing ? (
        <input
          type={type}
          value={formData[name] ?? ''}
          onChange={e => setFormData({ ...formData, [name]: e.target.value })}
          placeholder={placeholder}
          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
        />
      ) : (
        <div className="bg-slate-50/50 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 border border-slate-100 truncate min-h-[32px] flex items-center">
          {type === 'number' && name === 'annualSalary' ? `$${(Number(formData[name]) || 0).toLocaleString()}` : (formData[name] || '---')}
        </div>
      )}
    </div>
  );

  return (
    <LiquidGlassCard className="!p-0 overflow-hidden shadow-sm border-white/60 bg-white/40">
      {/* Header */}
      <div className="p-5 border-b border-white/40 bg-white/50 backdrop-blur-md flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Fingerprint size={16} className="text-slate-400" />
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Funding Profile Data</span>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"><X size={14} /></button>
              <button onClick={handleSave} className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"><Save size={14} /></button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="p-1.5 bg-white border border-slate-100 text-slate-400 rounded-lg hover:text-blue-600 transition-all shadow-sm"><Edit2 size={14} /></button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Identity Section */}
        <div className="space-y-3">
          <button onClick={() => toggleSection('identity')} className="w-full flex items-center justify-between group">
            <div className="flex items-center gap-2">
              <User size={14} className="text-blue-500" />
              <span className="text-[10px] font-black uppercase text-slate-900 tracking-tight">Identity</span>
            </div>
            {expanded.identity ? <ChevronUp size={14} className="text-slate-300" /> : <ChevronDown size={14} className="text-slate-300" />}
          </button>
          {expanded.identity && (
            <div className="grid grid-cols-1 gap-3 animate-fade-in pl-1">
              <InputField label="Full Legal Name" name="fullLegalName" />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Email" name="email" />
                <InputField label="Phone" name="phone" />
              </div>
              <InputField label="Home Address" name="address" icon={MapPin} />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="SSN" name="fullSSN" placeholder="Full SSN" />
                <InputField label="DOB" name="dob" icon={Calendar} />
              </div>
            </div>
          )}
        </div>

        {/* ID Section */}
        <div className="space-y-3 pt-2 border-t border-slate-100/50">
          <button onClick={() => toggleSection('government')} className="w-full flex items-center justify-between group">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span className="text-[10px] font-black uppercase text-slate-900 tracking-tight">Government ID</span>
            </div>
            {expanded.government ? <ChevronUp size={14} className="text-slate-300" /> : <ChevronDown size={14} className="text-slate-300" />}
          </button>
          {expanded.government && (
            <div className="grid grid-cols-1 gap-3 animate-fade-in pl-1">
              <InputField label="License / ID #" name="idNumber" />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Issue Date" name="idIssueDate" />
                <InputField label="Exp. Date" name="idExpirationDate" />
              </div>
            </div>
          )}
        </div>

        {/* Financial Profile Section */}
        <div className="space-y-3 pt-2 border-t border-slate-100/50">
          <button onClick={() => toggleSection('financial')} className="w-full flex items-center justify-between group">
            <div className="flex items-center gap-2">
              <Landmark size={14} className="text-purple-500" />
              <span className="text-[10px] font-black uppercase text-slate-900 tracking-tight">Financial Profile</span>
            </div>
            {expanded.financial ? <ChevronUp size={14} className="text-slate-300" /> : <ChevronDown size={14} className="text-slate-300" />}
          </button>
          {expanded.financial && (
            <div className="grid grid-cols-1 gap-3 animate-fade-in pl-1">
              {/* Calculator Logic for Salary */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                   <DollarSign size={10} /> Annual Salary
                </label>
                <div className="relative">
                  <input
                    type="number"
                    disabled={!isEditing}
                    value={formData.annualSalary || 0}
                    onChange={e => setFormData({ ...formData, annualSalary: e.target.value })}
                    className={`w-full bg-slate-50/50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none transition-all ${isEditing ? 'bg-white border-slate-200 focus:ring-4 focus:ring-blue-500/10' : ''}`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 pointer-events-none uppercase italic">
                    / ${monthlyIncome.toLocaleString()} mo
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Housing Pymt" name="monthlyRentPayment" type="number" />
                <InputField label="Tenure (Mo)" name="rentTenureMonths" type="number" />
              </div>
            </div>
          )}
        </div>

        {/* Employment Section */}
        <div className="space-y-3 pt-2 border-t border-slate-100/50">
          <button onClick={() => toggleSection('employment')} className="w-full flex items-center justify-between group">
            <div className="flex items-center gap-2">
              <Briefcase size={14} className="text-orange-500" />
              <span className="text-[10px] font-black uppercase text-slate-900 tracking-tight">Employment</span>
            </div>
            {expanded.employment ? <ChevronUp size={14} className="text-slate-300" /> : <ChevronDown size={14} className="text-slate-300" />}
          </button>
          {expanded.employment && (
            <div className="grid grid-cols-1 gap-3 animate-fade-in pl-1">
              <InputField label="Employer Name" name="employerName" />
              <InputField label="Tenure (Mo)" name="employmentTenureMonths" type="number" />
            </div>
          )}
        </div>
      </div>
    </LiquidGlassCard>
  );
};