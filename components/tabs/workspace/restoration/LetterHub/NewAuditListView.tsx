import React, { useState, useEffect } from 'react';
import { MergedAccount } from '@/types';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { ChevronUp, ChevronDown, CheckCircle2, Circle, Edit2, Save, FileCheck } from 'lucide-react';
import { NewAnalysisDetailView } from './NewAnalysisDetailView';

interface NewAuditListViewProps {
  label: string;
  items: MergedAccount[];
  clientId: string;
  color: string;
  bg: string;
  border: string;
  isOpen: boolean;
  onToggle: () => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  expandedDetails: Set<string>;
  onToggleDetail: (key: string) => void;
  onSaveNote: (rowId: string, bureau: string, note: string) => void;
  isInquiryList?: boolean;
  auditMap?: Record<string, any>;
}

export const NewAuditListView: React.FC<NewAuditListViewProps> = ({ 
  label, items, clientId, color, bg, border, isOpen, onToggle,
  selectedIds, onToggleSelection, expandedDetails, onToggleDetail, onSaveNote, isInquiryList, auditMap
}) => {
  return (
      <div className="space-y-4">
          <button 
            onClick={onToggle}
            className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all border ${border} ${bg} bg-opacity-30 group`}
          >
              <div className="flex items-center gap-3">
                  <span className={`text-xs font-black uppercase tracking-widest ${color}`}>{label}</span>
                  <span className="text-[10px] font-bold bg-white/60 px-2 py-0.5 rounded-full text-slate-500">{items.length}Items</span>
              </div>
              <div className={`${color} opacity-70 group-hover:opacity-100 transition-opacity`}>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
          </button>

          {isOpen && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-fade-in pl-2">
                  {items.length === 0 ? (
                      <div className="col-span-full text-center py-6 text-[10px] font-bold text-slate-400 italic opacity-60 bg-white/20 rounded-2xl border border-dashed border-slate-200">
                          No items found for {label}.
                      </div>
                  ) : (
                      items.map(acc => {
                          const bureauKey = label.toLowerCase().replace('inquiries', acc['bureauSource']?.toLowerCase() || 'unknown');
                          // SANITIZATION FIX: Replace '/' with '_' to prevent Firestore path errors
                          const safeRowId = acc.rowId.replace(/[\/]/g, '_');
                          const compositeKey = `${label === 'Inquiries' ? 'Inquiries' : label}__${safeRowId}`;
                          
                          const isSelected = selectedIds.has(compositeKey);
                          const isExpanded = expandedDetails.has(compositeKey);
                          
                          const specificData = (acc as any)[bureauKey];
                          const existingNote = specificData?.consultantNote || '';
                          const accountStatus = specificData?.accountStatus || 'Unknown Status';

                          // Audit Check
                          // Use the composite Key lookup which is now standardized in AuditAnalysisView
                          const auditData = auditMap ? auditMap[compositeKey] : null;
                          const hasAudit = !!auditData;

                          return (
                              <LiquidGlassCard 
                                  key={compositeKey}
                                  className={`group transition-all duration-300 border-l-4 relative overflow-hidden !p-0
                                      ${hasAudit
                                          ? 'border-l-emerald-500 bg-emerald-50/10' 
                                          : isSelected 
                                              ? 'bg-white border-l-[#007AFF] shadow-lg ring-1 ring-blue-100' 
                                              : 'bg-white/60 hover:bg-white/90 border-l-transparent hover:border-l-slate-300'
                                      }
                                  `}
                              >
                                  {/* Header Row */}
                                  <div className="p-4 flex items-start gap-4">
                                      <div 
                                        onClick={(e) => { e.stopPropagation(); onToggleSelection(compositeKey); }}
                                        className={`mt-1 cursor-pointer transition-colors ${isSelected ? 'text-[#007AFF]' : 'text-slate-300 group-hover:text-slate-400'}`}
                                      >
                                          {isSelected ? <CheckCircle2 size={20} strokeWidth={2.5} /> : <Circle size={20} />}
                                      </div>
                                      
                                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onToggleDetail(compositeKey)}>
                                          <div className="flex justify-between items-start">
                                              <div className="min-w-0 flex-1 pr-2">
                                                  <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                                      {acc.creditorName}
                                                  </h4>
                                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                                      {!isInquiryList && (
                                                          <>
                                                            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 uppercase tracking-tight truncate max-w-full">
                                                                {accountStatus}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{acc.accountType}</span>
                                                          </>
                                                      )}
                                                      {isInquiryList && (
                                                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{acc.dateOpened} • {acc['bureauSource']}</span>
                                                      )}
                                                      {hasAudit && (
                                                          <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                              <FileCheck size={10} /> Analyzed
                                                          </span>
                                                      )}
                                                  </div>
                                              </div>
                                              <div className="text-slate-300 hover:text-blue-500 transition-colors">
                                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                              </div>
                                          </div>
                                      </div>
                                  </div>

                                  {/* Expanded Area */}
                                  {isExpanded && (
                                      <div className="border-t border-slate-100">
                                          <NewAnalysisDetailView auditData={auditData} />
                                          
                                          {!isInquiryList && (
                                              <ConsultantNoteBox 
                                                  initialNote={existingNote} 
                                                  onSave={(note) => onSaveNote(acc.rowId, label, note)}
                                                  dbNote={auditData?.consultantNotesUsed} 
                                              />
                                          )}
                                      </div>
                                  )}
                              </LiquidGlassCard>
                          );
                      })
                  )}
              </div>
          )}
      </div>
  );
};

const ConsultantNoteBox: React.FC<{ initialNote: string, onSave: (n: string) => void, dbNote?: string }> = ({ initialNote, onSave, dbNote }) => {
    const [note, setNote] = useState(initialNote);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if(dbNote && dbNote !== note) setNote(dbNote);
    }, [dbNote]);

    const handleSave = () => {
        onSave(note);
        setIsDirty(false);
    };

    return (
        <div className="p-4 pt-0">
            <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100 space-y-2">
                <div className="flex justify-between items-center">
                    <h5 className="text-[9px] font-black uppercase text-amber-500 tracking-widest flex items-center gap-1.5">
                        <Edit2 size={10} /> Consultant Notes
                    </h5>
                    {isDirty && (
                        <button 
                            onClick={handleSave}
                            className="text-[9px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-amber-200 transition-colors"
                        >
                            <Save size={10} /> Save
                        </button>
                    )}
                </div>
                <textarea 
                    value={note}
                    onChange={(e) => { setNote(e.target.value); setIsDirty(true); }}
                    placeholder="Add manual analysis notes here..."
                    className="w-full text-[10px] font-medium text-slate-700 bg-white/50 border border-amber-200/50 rounded-lg p-2 focus:ring-2 focus:ring-amber-200 outline-none resize-none min-h-[60px]"
                />
            </div>
        </div>
    );
};