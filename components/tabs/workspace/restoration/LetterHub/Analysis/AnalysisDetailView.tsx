import React from 'react';
import { Activity, TrendingUp, Flag, Scale } from 'lucide-react';
import { MergedAccount } from '@/types';

interface AnalysisDetailViewProps {
  account: MergedAccount;
}

export const AnalysisDetailView: React.FC<AnalysisDetailViewProps> = ({ account }) => {
  return (
      <div className="p-4 pt-0 animate-fade-in">
          <div className="bg-blue-50/40 rounded-xl p-3 border border-blue-100/50 space-y-3">
              <h5 className="text-[9px] font-black uppercase text-blue-400 tracking-widest flex items-center gap-1.5">
                  <Activity size={10} /> Forensic Analysis Data
              </h5>
              
              <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/60 p-2 rounded-lg border border-blue-50 text-center">
                      <TrendingUp size={14} className="mx-auto text-orange-400 mb-1" />
                      <span className="block text-[8px] font-bold text-slate-400 uppercase">Metric Variance</span>
                      <span className="text-[10px] font-black text-slate-700">Detected</span>
                  </div>
                  <div className="bg-white/60 p-2 rounded-lg border border-blue-50 text-center">
                      <Flag size={14} className="mx-auto text-red-400 mb-1" />
                      <span className="block text-[8px] font-bold text-slate-400 uppercase">Inaccuracy</span>
                      <span className="text-[10px] font-black text-slate-700">High Prob</span>
                  </div>
                  <div className="bg-white/60 p-2 rounded-lg border border-blue-50 text-center">
                      <Scale size={14} className="mx-auto text-purple-400 mb-1" />
                      <span className="block text-[8px] font-bold text-slate-400 uppercase">Metro2</span>
                      <span className="text-[10px] font-black text-slate-700">Non-Compliant</span>
                  </div>
              </div>
              
              <p className="text-[9px] text-slate-500 leading-relaxed italic px-1">
                  "Discrepancy found in Date of Last Activity vs. Payment History string. Recommended factual dispute strategy: Date Validity."
              </p>
          </div>
      </div>
  );
};