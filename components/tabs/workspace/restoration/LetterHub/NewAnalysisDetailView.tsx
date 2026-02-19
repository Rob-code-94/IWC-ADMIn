import React from 'react';
import { AlertTriangle, CheckCircle2, BookOpen, Gavel, User, Scale, Code, GitCompare, Calendar } from 'lucide-react';

// Updated Schema matching Backend Output
interface Violation {
  law_violated: string;
  error_description: string;
  recommended_dispute: string;
  metro2_code_ref: string;
}

interface ViolationReport {
    part_1_fcra: string;
    part_2_metro2: string;
    part_3_cross_bureau: string;
}

interface AuditResult {
  // Legacy List
  violation_list: Violation[];
  // New 3-Part Report
  violation_report?: ViolationReport;
  
  research_needed?: boolean;
  auditedAt: any;
  consultantNotesUsed?: string; 
  reportDateUsed?: string;
  status?: string;
}

interface NewAnalysisDetailViewProps {
  auditData: AuditResult | null;
}

export const NewAnalysisDetailView: React.FC<NewAnalysisDetailViewProps> = ({ auditData }) => {
  if (!auditData) {
    return (
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Analysis On File</p>
            <p className="text-xs text-slate-500 mt-1">Select this item and run the Forensic Auditor.</p>
        </div>
    );
  }

  const result = auditData;
  const hasNewReport = !!result.violation_report;
  
  // Fallback check for legacy violations list
  const violations = Array.isArray(result.violation_list) ? result.violation_list : [];
  const hasViolations = violations.length > 0;

  return (
    <div className="p-5 bg-white border-t border-slate-100 space-y-5 animate-fade-in">
        
        {/* Header / Engine Status */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                {hasNewReport || hasViolations ? (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                        <AlertTriangle size={14} />
                        <span className="text-xs font-black uppercase tracking-wide">Violations Detected</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                        <CheckCircle2 size={14} />
                        <span className="text-xs font-black uppercase tracking-wide">Clean Item</span>
                    </div>
                )}
                {result.research_needed && (
                    <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 flex items-center gap-1">
                        <BookOpen size={10} /> Library Grounded
                    </span>
                )}
            </div>
            <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Engine</span>
                <span className="text-[10px] font-black text-slate-900">Gemini 3 Flash</span>
            </div>
        </div>

        {/* PRIMARY VIEW: 3-Part Forensic Report */}
        {hasNewReport && result.violation_report ? (
            <div className="space-y-4">
                
                {/* 1. Legal (FCRA) */}
                <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-white rounded-lg text-red-500 shadow-sm border border-red-100">
                            <Scale size={14} />
                        </div>
                        <h4 className="text-[10px] font-black uppercase text-red-700 tracking-widest">Legal (FCRA)</h4>
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-line">
                        {result.violation_report.part_1_fcra}
                    </p>
                </div>

                {/* 2. Technical (Metro 2) */}
                <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-white rounded-lg text-purple-500 shadow-sm border border-purple-100">
                            <Code size={14} />
                        </div>
                        <h4 className="text-[10px] font-black uppercase text-purple-700 tracking-widest">Technical (Metro 2)</h4>
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-line">
                        {result.violation_report.part_2_metro2}
                    </p>
                </div>

                {/* 3. Bureau Inconsistency */}
                <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-white rounded-lg text-orange-500 shadow-sm border border-orange-100">
                            <GitCompare size={14} />
                        </div>
                        <h4 className="text-[10px] font-black uppercase text-orange-700 tracking-widest">Bureau Inconsistency</h4>
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-line">
                        {result.violation_report.part_3_cross_bureau}
                    </p>
                </div>

            </div>
        ) : hasViolations ? (
            /* FALLBACK VIEW: Legacy Violation List */
            <div className="space-y-3">
                {violations.map((v, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-2">
                        <div className="flex justify-between items-start">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                {v.law_violated}
                            </span>
                            <span className="text-[9px] font-mono text-purple-500 font-bold">
                                {v.metro2_code_ref}
                            </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 leading-tight">
                            {v.error_description}
                        </p>
                        <div className="mt-2 pt-2 border-t border-slate-200/50 flex gap-2 items-start">
                            <Gavel size={12} className="text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Strategy</span>
                                <p className="text-xs text-blue-700 font-medium italic">
                                    "{v.recommended_dispute}"
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center py-4 bg-emerald-50/30 rounded-xl border border-emerald-100/50">
                <p className="text-xs text-emerald-700 font-bold italic">No factual or legal violations detected by the auditor.</p>
                <p className="text-[9px] text-emerald-500/80 uppercase tracking-widest mt-1">Item verified as accurate</p>
            </div>
        )}

        {/* METADATA FOOTER */}
        <div className="grid grid-cols-1 gap-4 pt-2">
            {/* Consultant Context */}
            {result.consultantNotesUsed && (
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/50 flex gap-3 items-start">
                    <User size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-1">Consultant Context Applied</span>
                        <p className="text-[10px] font-medium text-slate-600 italic leading-relaxed">
                            "{result.consultantNotesUsed}"
                        </p>
                    </div>
                </div>
            )}

            {/* Audit Date */}
            {result.reportDateUsed && (
                <div className="flex items-center justify-end gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-80">
                    <Calendar size={10} />
                    Audit Grounded: {result.reportDateUsed}
                </div>
            )}
        </div>
    </div>
  );
};