import React, { useState, useEffect, useRef } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { 
  UploadCloud, FileText, AlertCircle, Loader2, 
  ExternalLink, ChevronDown, ChevronUp, CheckCircle, 
  Search, Info, BarChart3, Clock, Plus, X, Calendar, Layers, Edit2, Save
} from 'lucide-react';
import { Client } from '@/types';
import { db, storage, functions } from '@/services/firebase';
import { doc, onSnapshot, collection, query, orderBy, limit, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';

interface BureauData {
  overallStatus: 'Positive' | 'Negative';
  accountStatus: string;
  balance: number;
  creditLimit: string;
  monthlyPayment: string;
  lastReported: string;
  disputeStatus?: string;
  paymentHistory?: string;
  key4Part?: string;
  consultantNote?: string;
}

interface MergedAccount {
  rowId: string;
  creditorName: string;
  accountNumber: string;
  accountType: string;
  dateOpened: string;
  dateClosed: string;
  experian?: BureauData;
  equifax?: BureauData;
  transunion?: BureauData;
  iwcKey?: string;
}

interface Inquiry {
  bureau: string;
  creditorName: string;
  date: string;
}

interface AnalysisReport {
  id: string;
  reportDate: string;
  status: string;
  fileName?: string;
  reportUrl?: string;
  scores: { bureau: string; score: number }[];
  mergedAccounts: MergedAccount[];
  inquiries?: Inquiry[];
}

export const ReportTab: React.FC<{ client: Client }> = ({ client }) => {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManagementOpen, setIsManagementOpen] = useState(false);

  // UI State: Collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    negative: true,
    positive: false,
    inquiries: false
  });

  // UI State: Expanded individual account rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!client.id) return;
    
    // 1. Live Sync: Latest Analysis
    const unsubReport = onSnapshot(doc(db, 'clients', client.id, 'reports', 'latest_analysis'), (docSnap) => {
      if (docSnap.exists()) {
        setReport({ id: docSnap.id, ...docSnap.data() } as AnalysisReport);
      } else {
        setReport(null);
      }
      setLoading(false);
    });

    // 2. Live Sync: History
    const q = query(
      collection(db, 'clients', client.id, 'reports'),
      orderBy('reportDate', 'desc'),
      limit(10)
    );
    const unsubHistory = onSnapshot(q, (snap) => {
      setHistory(snap.docs.filter(d => d.id !== 'latest_analysis').map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubReport();
      unsubHistory();
    };
  }, [client.id]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleRow = (rowId: string) => {
    const next = new Set(expandedRows);
    if (next.has(rowId)) next.delete(rowId);
    else next.add(rowId);
    setExpandedRows(next);
  };

  const handleSaveConsultantNote = async (rowId: string, bureau: string, note: string) => {
    if (!report) return;
    
    // Optimistic Update
    const updatedAccounts = report.mergedAccounts.map(acc => {
        if (acc.rowId === rowId) {
            const bureauKey = bureau.toLowerCase() as 'experian' | 'equifax' | 'transunion';
            if (acc[bureauKey]) {
                return {
                    ...acc,
                    [bureauKey]: {
                        ...acc[bureauKey]!,
                        consultantNote: note
                    }
                };
            }
        }
        return acc;
    });

    setReport(prev => prev ? ({ ...prev, mergedAccounts: updatedAccounts }) : null);

    // DB Update
    try {
        await updateDoc(doc(db, 'clients', client.id, 'reports', 'latest_analysis'), {
            mergedAccounts: updatedAccounts
        });
    } catch (e) {
        console.error("Failed to save note:", e);
    }
  };

  const negativeAccounts = report?.mergedAccounts?.filter(acc => 
    acc.experian?.overallStatus === 'Negative' || 
    acc.equifax?.overallStatus === 'Negative' || 
    acc.transunion?.overallStatus === 'Negative'
  ) || [];

  const positiveAccounts = report?.mergedAccounts?.filter(acc => 
    !negativeAccounts.some(n => n.rowId === acc.rowId)
  ) || [];

  const inquiries = report?.inquiries || [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 opacity-30">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="text-sm font-black uppercase tracking-[0.2em]">Booting Analysis Core...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in pb-12 relative">
      
      {/* REPORT MANAGEMENT MODAL */}
      {isManagementOpen && (
        <ReportManagementModal 
            isOpen={isManagementOpen} 
            onClose={() => setIsManagementOpen(false)} 
            history={history}
            clientId={client.id}
        />
      )}

      {/* MASTER HEADER */}
      <LiquidGlassCard className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 flex-shrink-0 mb-6 w-full">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight truncate">Master Credit Analysis</h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-1 truncate">Comparing real-time data across Experian, Equifax, and TransUnion.</p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl border border-white/40 shadow-inner">
                {['EXP', 'EQ', 'TU'].map(b => (
                <span key={b} className="px-3 md:px-4 py-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-black tracking-widest shadow-sm">{b}</span>
                ))}
            </div>
            <button 
                onClick={() => setIsManagementOpen(true)}
                className="w-10 h-10 bg-[#007AFF] text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all"
                title="Manage Reports & Ingestion"
            >
                <Plus size={20} strokeWidth={3} />
            </button>
          </div>
      </LiquidGlassCard>

      {/* MAIN CONTENT: Master Report Feed */}
      <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
        
        {!report ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white/40 rounded-[3rem] border border-dashed border-slate-200">
            <Search size={64} className="text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-900">Queue is Empty</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xs text-center">Once a report is ingested via the Plus menu, the forensic analysis will populate here.</p>
          </div>
        ) : (
          <div className="space-y-6 pb-20">
            
            {/* 1. NEGATIVE ACCOUNTS */}
            <div className="space-y-4">
              <button 
                onClick={() => toggleSection('negative')}
                className="w-full flex items-center justify-between px-4 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Negative Accounts ({negativeAccounts.length})</h3>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-slate-900 transition-all">
                  {expandedSections.negative ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {expandedSections.negative && (
                <div className="space-y-4 animate-fade-in">
                  {negativeAccounts.map((acc) => (
                    <AccountCard 
                      key={acc.rowId} 
                      account={acc} 
                      isExpanded={expandedRows.has(acc.rowId)}
                      onToggle={() => toggleRow(acc.rowId)}
                      onSaveNote={handleSaveConsultantNote}
                    />
                  ))}
                  {negativeAccounts.length === 0 && <p className="text-center py-4 text-xs font-bold text-slate-400 uppercase italic">Clean Sweep: No Negative Accounts Found</p>}
                </div>
              )}
            </div>

            {/* 2. POSITIVE ACCOUNTS */}
            <div className="space-y-4">
              <button 
                onClick={() => toggleSection('positive')}
                className="w-full flex items-center justify-between px-4 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Positive Accounts ({positiveAccounts.length})</h3>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-slate-900 transition-all">
                  {expandedSections.positive ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {expandedSections.positive && (
                <div className="space-y-4 animate-fade-in">
                  {positiveAccounts.map((acc) => (
                    <AccountCard 
                      key={acc.rowId} 
                      account={acc} 
                      isExpanded={expandedRows.has(acc.rowId)}
                      onToggle={() => toggleRow(acc.rowId)}
                      onSaveNote={handleSaveConsultantNote}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 3. INQUIRIES */}
            <div className="space-y-4">
              <button 
                onClick={() => toggleSection('inquiries')}
                className="w-full flex items-center justify-between px-4 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Hard Inquiries ({inquiries.length})</h3>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-slate-900 transition-all">
                  {expandedSections.inquiries ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {expandedSections.inquiries && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                  {inquiries.map((inq, i) => (
                    <LiquidGlassCard key={i} className="!p-4 flex items-center justify-between group hover:bg-white transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
                          <BarChart3 size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{inq.creditorName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{inq.bureau}</p>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-slate-500">{inq.date}</p>
                    </LiquidGlassCard>
                  ))}
                  {inquiries.length === 0 && (
                    <div className="col-span-full py-8 text-center text-xs font-bold text-slate-400 italic">No inquiries found in this snapshot</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MODAL COMPONENT ---
const ReportManagementModal: React.FC<{ isOpen: boolean, onClose: () => void, history: any[], clientId: string }> = ({ isOpen, onClose, history, clientId }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [bureauType, setBureauType] = useState('3B');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setStatusText("Uploading to Secure Storage...");

        try {
            // 1. Firebase Storage Upload
            const storageRef = ref(storage, `clients/${clientId}/reports/${file.name}`);
            await uploadBytes(storageRef, file);
            
            // 2. Retrieve Download URL
            const downloadUrl = await getDownloadURL(storageRef);

            // 3. Update Status
            setStatusText(bureauType === '3B' ? "Tri-Merge Running..." : "Surgical Merge Active...");

            // Helper to map UI selection to Backend Enum strictly
            const getBureauEnum = (uiType: string) => {
                switch(uiType) {
                    case 'Experian': return 'experian_only';
                    case 'Equifax': return 'equifax_only';
                    case 'TransUnion': return 'transunion_only';
                    default: return '3b'; 
                }
            };

            // 4. Cloud Function Invocation
            const creditReportFn = httpsCallable(functions, 'creditReport', { timeout: 540000 });
            await creditReportFn({
                pdfUrl: downloadUrl,
                clientId: clientId,
                reportDate: reportDate,
                bureau: getBureauEnum(bureauType) 
            });

            // 5. Completion
            setStatusText("Analysis Complete");
            setTimeout(() => {
                onClose();
                setIsProcessing(false);
                setStatusText('');
            }, 1000);

        } catch (error) {
            console.error("Report Ingestion Error:", error);
            setStatusText("Ingestion Failed");
            setTimeout(() => setIsProcessing(false), 2500);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <LiquidGlassCard className="w-full max-w-2xl relative z-10 !p-0 overflow-hidden shadow-2xl animate-fade-in-up flex flex-col">
                <div className="p-6 border-b border-white/40 bg-white/60 backdrop-blur-md flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 text-xl tracking-tight">Report Management</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50">
                    <div className="space-y-6">
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">New Ingestion</h4>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                                    <Calendar size={10} /> Report Date
                                </label>
                                <input 
                                    type="date"
                                    value={reportDate}
                                    onChange={(e) => setReportDate(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                                    <Layers size={10} /> Bureau Type
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['3B', 'Experian', 'Equifax', 'TransUnion'].map(b => (
                                        <button
                                            key={b}
                                            onClick={() => setBureauType(b)}
                                            className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all
                                                ${bureauType === b 
                                                    ? 'bg-slate-800 text-white shadow-md' 
                                                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}
                                            `}
                                        >
                                            {b === '3B' ? 'Triple Bureau' : b}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div 
                            onClick={() => !isProcessing && fileInputRef.current?.click()}
                            className={`w-full border-2 border-dashed border-slate-300 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center transition-all group h-48 cursor-pointer relative overflow-hidden
                            ${isProcessing ? 'bg-blue-50/50 border-blue-200 cursor-wait' : 'bg-white hover:border-blue-400'}`}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept=".pdf,.html"
                                onChange={handleFileSelect}
                                disabled={isProcessing}
                            />
                            {isProcessing ? (
                                <div className="animate-fade-in flex flex-col items-center">
                                    <Loader2 size={32} className="animate-spin text-blue-600 mb-3" />
                                    <p className="text-sm font-bold text-blue-700">{statusText}</p>
                                    <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase tracking-wider">Do not close window</p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <UploadCloud size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-700">Tap to Ingest Report</p>
                                    <p className="text-[10px] text-slate-400 mt-1 font-medium">Supports SmartCredit & IQ PDF/HTML</p>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col h-full min-h-[300px]">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Snapshots</h4>
                            <Clock size={14} className="text-slate-300" />
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white rounded-[1.5rem] border border-slate-200 p-2 space-y-2">
                            {history.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                    <FileText size={24} className="text-slate-300 mb-2" />
                                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">No history available</p>
                                </div>
                            ) : (
                                history.map((h) => (
                                    <button key={h.id} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-all group text-left border border-transparent hover:border-slate-100">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                            <FileText size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-700 truncate">{h.fileName || '3-Bureau Report'}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{h.reportDate}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </LiquidGlassCard>
        </div>
    );
};

// --- SUB-COMPONENTS ---

const AccountCard: React.FC<{ 
    account: MergedAccount, 
    isExpanded: boolean, 
    onToggle: () => void,
    onSaveNote: (rowId: string, bureau: string, note: string) => void 
}> = ({ account, isExpanded, onToggle, onSaveNote }) => {
  const isNegative = account.experian?.overallStatus === 'Negative' || account.equifax?.overallStatus === 'Negative' || account.transunion?.overallStatus === 'Negative';

  return (
    <LiquidGlassCard className="!p-0 overflow-hidden shadow-sm hover:shadow-md transition-all border-white/60">
      {/* Account Header */}
      <div className="bg-slate-50/80 p-5 border-b border-white/40 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm
            ${isNegative ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
            {isNegative ? <AlertCircle size={20} strokeWidth={2.5} /> : <CheckCircle size={20} strokeWidth={2.5} />}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="font-black text-slate-900 text-[15px] uppercase tracking-tight">{account.creditorName}</span>
              <span className="text-slate-400 font-bold text-xs">— {account.accountNumber}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Type: {account.accountType || 'Other'}</span>
               {account.dateOpened && account.dateOpened !== 'Not Provided' && (
                   <span className="text-[9px] font-black uppercase text-slate-300 tracking-wider">• Opened {account.dateOpened}</span>
               )}
               {account.dateClosed && account.dateClosed !== 'Not Provided' && (
                   <span className="text-[9px] font-black uppercase text-slate-300 tracking-wider">• Closed {account.dateClosed}</span>
               )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-[10px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
            View Forensic Delta <ExternalLink size={10} strokeWidth={3} />
          </button>
        </div>
      </div>
      
      {/* 3-Bureau Grid */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 bg-white/20">
        <BureauColumn bureau="Experian" data={account.experian} isExpanded={isExpanded} rowId={account.rowId} onSaveNote={onSaveNote} />
        <BureauColumn bureau="Equifax" data={account.equifax} isExpanded={isExpanded} isAlternate rowId={account.rowId} onSaveNote={onSaveNote} />
        <BureauColumn bureau="TransUnion" data={account.transunion} isExpanded={isExpanded} rowId={account.rowId} onSaveNote={onSaveNote} />
      </div>

      {/* Expand Footer Action */}
      <button 
        onClick={onToggle}
        className="w-full py-2 bg-slate-50/50 hover:bg-slate-100/50 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all border-t border-white/40"
      >
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
    </LiquidGlassCard>
  );
};

const BureauColumn: React.FC<{ 
    bureau: string, 
    data?: BureauData, 
    isExpanded: boolean, 
    isAlternate?: boolean,
    rowId: string,
    onSaveNote: (rowId: string, bureau: string, note: string) => void
}> = ({ bureau, data, isExpanded, isAlternate, rowId, onSaveNote }) => {
  const [note, setNote] = useState(data?.consultantNote || '');
  const [isEditingNote, setIsEditingNote] = useState(false);

  // Sync local state when prop updates (from external save or reload)
  useEffect(() => {
      setNote(data?.consultantNote || '');
  }, [data?.consultantNote]);

  const handleBlurNote = () => {
      setIsEditingNote(false);
      if (note !== data?.consultantNote) {
          onSaveNote(rowId, bureau, note);
      }
  };

  if (!data) return (
    <div className={`p-6 flex flex-col items-center justify-center text-center ${isAlternate ? 'bg-slate-50/30' : ''}`}>
      <p className="text-[10px] font-black text-slate-300 uppercase mb-4 tracking-widest">{bureau}</p>
      <span className="text-[10px] font-black text-blue-400 tracking-wider bg-blue-50/50 px-3 py-1 rounded-full border border-blue-100/50 uppercase">Not Reported</span>
    </div>
  );

  return (
    <div className={`p-6 space-y-5 ${isAlternate ? 'bg-slate-50/30' : ''} animate-fade-in`}>
      <p className="text-[10px] font-black text-slate-300 uppercase text-center mb-6 tracking-widest">{bureau}</p>
      
      {/* FIELDS GRID - Aligned Key/Value Pairs */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">BAL:</span> 
          <span className="text-sm font-black text-slate-700">${(data.balance || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">STATUS:</span> 
          <span className={`text-[11px] font-black uppercase tracking-tight text-right ${data.overallStatus === 'Negative' ? 'text-red-500' : 'text-emerald-500'}`}>
            {data.accountStatus || (data.overallStatus === 'Negative' ? 'Derogatory' : 'Pays as agreed')}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">PAY:</span> 
          <span className="text-[11px] font-black text-slate-600">{data.lastReported || 'Not Provided'}</span>
        </div>

        {/* EXPANDED FIELDS (Always render placeholders to maintain grid if desired, but here we toggle opacity or height) */}
        {isExpanded && (
            <div className="space-y-4 pt-2 animate-fade-in">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">LIMIT:</span> 
                    <span className="text-[11px] font-bold text-slate-500">{data.creditLimit || 'Not Provided'}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">PYMT:</span> 
                    <span className="text-[11px] font-bold text-slate-500">{data.monthlyPayment || 'Not Provided'}</span>
                </div>
                
                {/* Not Provided Pill - Only show if absolutely no relevant data is present for status/pay */}
                {(!data.lastReported || data.lastReported === 'Not Provided') && (!data.monthlyPayment || data.monthlyPayment === 'Not Provided') && (
                    <div className="flex justify-center pt-2">
                        <span className="text-[9px] font-black text-blue-400 bg-blue-50/50 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5 uppercase tracking-wider">
                            <Info size={10} strokeWidth={3} /> Not Provided
                        </span>
                    </div>
                )}

                {/* Dispute Status */}
                {data.disputeStatus && data.disputeStatus !== 'Not Provided' && (
                    <div className="pt-2">
                        <span className="text-[9px] font-black text-purple-500 bg-purple-50 px-2 py-1 rounded-lg uppercase tracking-wider border border-purple-100 flex items-center gap-1.5 w-fit">
                            <Info size={10} /> {data.disputeStatus}
                        </span>
                    </div>
                )}

                {/* Payment History */}
                <div className="space-y-2 mt-4">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">PAYMENT HISTORY:</span>
                    <div className="p-3 bg-slate-100/50 rounded-lg text-[10px] font-bold font-mono text-slate-500 break-all leading-relaxed border border-slate-100">
                        {data.paymentHistory && data.paymentHistory !== 'Not Provided' ? data.paymentHistory : "No history available"}
                    </div>
                </div>

                {/* Consultant Note */}
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-100/50">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">CONSULTANT NOTE:</span>
                    {isEditingNote ? (
                        <div className="relative">
                            <textarea 
                                autoFocus
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                onBlur={handleBlurNote}
                                className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-[10px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-yellow-400/20 resize-none min-h-[60px]"
                                placeholder="Add notes here..."
                            />
                            <div className="absolute bottom-1 right-2 text-[8px] text-yellow-600 font-bold uppercase pointer-events-none">Editing</div>
                        </div>
                    ) : (
                        <div 
                            onClick={() => setIsEditingNote(true)}
                            className="p-3 bg-yellow-50/30 rounded-lg border border-yellow-100/50 cursor-text hover:bg-yellow-50 hover:border-yellow-200 transition-all group min-h-[40px] flex items-center"
                        >
                            {note ? (
                                <p className="text-[10px] text-slate-600 font-medium italic w-full">"{note}"</p>
                            ) : (
                                <p className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <Edit2 size={10} /> Add Note
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};