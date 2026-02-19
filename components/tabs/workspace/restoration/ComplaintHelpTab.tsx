import React, { useState } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { VoiceTextArea } from '@/components/ui/VoiceTextArea';
import { Building2, Scale, ArrowRight, ShieldAlert } from 'lucide-react';
import { Client } from '@/types';

export const ComplaintHelpTab: React.FC<{ client: Client }> = () => {
  const [step, setStep] = useState(1);
  const [agency, setAgency] = useState('CFPB');

  return (
    <div className="max-w-3xl mx-auto animate-fade-in py-6">
        <LiquidGlassCard className="p-8">
            <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-slate-900/20">
                    <Scale size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Regulatory Complaint Wizard</h2>
                <p className="text-slate-500 font-medium mt-2">Escalate violations to federal agencies.</p>
            </div>

            <div className="space-y-8">
                {/* 1. Agency Selector */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Select Agency</label>
                    <div className="grid grid-cols-3 gap-4">
                        {['CFPB', 'FTC', 'State AG'].map((a) => (
                            <button
                                key={a}
                                onClick={() => setAgency(a)}
                                className={`p-4 rounded-2xl border-2 text-center transition-all
                                    ${agency === a 
                                        ? 'border-[#007AFF] bg-blue-50 text-blue-700' 
                                        : 'border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200'}
                                `}
                            >
                                <Building2 className="mx-auto mb-2 opacity-50" size={20} />
                                <span className="block font-bold text-sm">{a}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. Account Checklist */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Link Violations</label>
                    <div className="max-h-40 overflow-y-auto custom-scrollbar border border-slate-200 rounded-2xl p-2 bg-slate-50">
                         {[1, 2, 3].map((i) => (
                            <label key={i} className="flex items-center gap-3 p-3 hover:bg-white rounded-xl cursor-pointer transition-colors">
                                <input type="checkbox" className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300" />
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-slate-800">MIDLAND CREDIT MGMT</p>
                                    <p className="text-xs text-slate-500">FCRA Violation • Re-aging Debt</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* 3. Description */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Legal Description</label>
                    <VoiceTextArea />
                    <p className="text-[10px] text-slate-400 px-2">Dictate specific details about dates, times, and nature of the harassment or violation.</p>
                </div>

                {/* Submit Action */}
                <div className="pt-4">
                    <button className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-bold shadow-xl shadow-slate-900/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                        <ShieldAlert size={20} />
                        Generate & File {agency} Complaint
                        <ArrowRight size={18} className="opacity-70" />
                    </button>
                </div>
            </div>
        </LiquidGlassCard>
    </div>
  );
};