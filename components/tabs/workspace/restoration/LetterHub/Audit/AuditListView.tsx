import React from 'react';
import { MergedAccount } from '@/types';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { ChevronUp, ChevronDown, CheckCircle2, Circle } from 'lucide-react';
import { AnalysisDetailView } from '../Analysis/AnalysisDetailView';

interface AuditListViewProps {
  label: string;
  items: MergedAccount[];
  color: string;
  bg: string;
  border: string;
  isOpen: boolean;
  onToggle: () => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  expandedDetails: Set<string>;
  onToggleDetail: (key: string) => void;
}

export const AuditListView: React.FC<AuditListViewProps> = ({ 
  label, items, color, bg, border, isOpen, onToggle,
  selectedIds, onToggleSelection, expandedDetails, onToggleDetail
}) => {
  return (
      <div className="space-y-4">
          <button 
            onClick={onToggle}
            className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all border ${border} ${bg} bg-opacity-30`}
          >
              <div className="flex items-center gap-3">
                  <span className={`text-xs font-black uppercase tracking-widest ${color}`}>{label}</span>
                  <span className="text-[10px] font-bold bg-white/60 px-2 py-0.5 rounded-full text-slate-500">{items.length} Items</span>
              </div>
              <div className={`${color}`}>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
          </button>

          {isOpen && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-fade-in pl-2">
                  {items.length === 0 ? (
                      <div className="col-span-full text-center py-4 text-[10px] font-bold text-slate-400 italic opacity-60">No negative items found for {label}.</div>
                  ) : (
                      items.map(acc => {
                          const isSelected = selectedIds.has(acc.rowId);
                          const detailKey = `${label}-${acc.rowId}`;
                          const isExpanded = expandedDetails.has(detailKey);
                          const isAnalyzed = acc.analysisRan;

                          return (
                              <LiquidGlassCard 
                                  key={detailKey}
                                  className={`group transition-all duration-300 border-l-4 relative overflow-hidden !p-0
                                      ${isSelected 
                                          ? 'bg-white border-l-[#007AFF] shadow-lg' 
                                          : 'bg-white/60 hover:bg-white/90 border-l-transparent hover:border-l-slate-300'}
                                  `}
                              >
                                  {/* Header Row */}
                                  <div className="p-4 flex items-start gap-4">
                                      <div 
                                        onClick={() => onToggleSelection(acc.rowId)}
                                        className={`mt-1 cursor-pointer transition-colors ${isSelected ? 'text-[#007AFF]' : 'text-slate-300 group-hover:text-slate-400'}`}
                                      >
                                          {isSelected ? <CheckCircle2 size={20} strokeWidth={2.5} /> : <Circle size={20} />}
                                      </div>
                                      
                                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onToggleDetail(detailKey)}>
                                          <div className="flex justify-between items-start">
                                              <div>
                                                  <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                                      {acc.creditorName}
                                                  </h4>
                                                  <div className="flex items-center gap-2 mt-1">
                                                      <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 rounded">{acc.accountNumber}</span>
                                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{acc.accountType}</span>
                                                  </div>
                                              </div>
                                              <div className="text-slate-300 hover:text-blue-500 transition-colors">
                                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                              </div>
                                          </div>
                                      </div>
                                  </div>

                                  {/* Expanded Forensic Panel */}
                                  {isExpanded && <AnalysisDetailView account={acc} />}

                                  {isAnalyzed && !isSelected && !isExpanded && (
                                      <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
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