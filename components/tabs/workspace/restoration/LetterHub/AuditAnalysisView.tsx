import React, { useState, useEffect } from 'react';
import { Client, AnalysisReport, MergedAccount } from '@/types';
import { db } from '@/services/firebase';
import { doc, collection, onSnapshot, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { 
  ShieldAlert, CheckCircle2, Search, Wand2, Fingerprint, Activity, Info, FileSearch, RotateCw
} from 'lucide-react';
import { NewAuditListView } from './NewAuditListView';
import { runForensicAudit } from '@/services/forensicAudit';

interface AuditAnalysisViewProps {
  client: Client;
}

export const AuditAnalysisView: React.FC<AuditAnalysisViewProps> = ({ client }) => {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Real-time Audit Results Map
  const [auditMap, setAuditMap] = useState<Record<string, any>>({});
  
  // View State for Groups
  const [expandedSections, setExpandedSections] = useState({
      'Experian': true,
      'Equifax': true,
      'TransUnion': true,
      'Inquiries': false
  });
  
  // Expanded Detail State (key: compositeID)
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  // 1. Live Sync: Latest Analysis Report (The Inventory)
  useEffect(() => {
    if (!client.id) return;
    const unsub = onSnapshot(doc(db, 'clients', client.id, 'reports', 'latest_analysis'), (docSnap) => {
        if (docSnap.exists()) {
            setReport({ id: docSnap.id, ...docSnap.data() } as AnalysisReport);
        } else {
            setReport(null);
        }
        setLoading(false);
    });
    return () => unsub();
  }, [client.id]);

  // 2. Live Sync: Account Audits Subcollection (The Forensic Results)
  useEffect(() => {
    if (!client.id) return;
    const auditsRef = collection(db, 'clients', client.id, 'account_audits');
    const unsubAudits = onSnapshot(auditsRef, (snapshot) => {
        const results: Record<string, any> = {};
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            // Use doc.id (iwc_key) as the primary map key to ensure alignment
            results[doc.id] = { 
                id: doc.id,
                ...data,
                // Ensure analysis map is merged for flattened access
                ...data.analysis 
            };
        });
        setAuditMap(results);
    });
    return () => unsubAudits();
  }, [client.id]);

  // 3. Filter Logic
  const negativeAccounts = report?.mergedAccounts || [];
  
  const expItems = negativeAccounts.filter(acc => acc.experian?.overallStatus === 'Negative');
  const eqItems = negativeAccounts.filter(acc => acc.equifax?.overallStatus === 'Negative');
  const tuItems = negativeAccounts.filter(acc => acc.transunion?.overallStatus === 'Negative');
  
  const inquiries = (report?.inquiries || []).map((inq, idx) => ({
      rowId: `inq_${idx}`,
      creditorName: inq.creditorName,
      accountNumber: 'INQUIRY',
      accountType: 'Hard Inquiry',
      dateOpened: inq.date,
      dateClosed: '',
      [inq.bureau.toLowerCase()]: {
          overallStatus: 'Negative', 
          accountStatus: 'Inquiry',
          balance: 0,
          consultantNote: ''
      },
      bureauSource: inq.bureau 
  } as any));

  const totalNegatives = expItems.length + eqItems.length + tuItems.length + inquiries.length;

  const toggleSelection = (compositeId: string) => {
    const next = new Set(selectedIds);
    if (next.has(compositeId)) next.delete(compositeId);
    else next.add(compositeId);
    setSelectedIds(next);
  };

  const toggleSection = (section: string) => {
      setExpandedSections(prev => ({ ...prev, [section as keyof typeof prev]: !prev[section as keyof typeof prev] }));
  };

  const toggleDetail = (key: string) => {
      const next = new Set(expandedDetails);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setExpandedDetails(next);
  };

  const handleSaveNote = async (rowId: string, bureau: string, note: string) => {
      if (!report) return;
      if (rowId.startsWith('inq_')) return;

      const updatedAccounts = report.mergedAccounts.map(acc => {
          if (acc.rowId === rowId) {
              const bureauKey = bureau.toLowerCase();
              if ((acc as any)[bureauKey]) {
                  return {
                      ...acc,
                      [bureauKey]: {
                          ...(acc as any)[bureauKey],
                          consultantNote: note
                      }
                  };
              }
          }
          return acc;
      });

      try {
          await updateDoc(doc(db, 'clients', client.id, 'reports', 'latest_analysis'), {
              mergedAccounts: updatedAccounts
          });
      } catch (e) {
          console.error("Failed to save consultant note:", e);
      }
  };

  const handleRunAnalysis = async () => {
    if (selectedIds.size === 0) return;
    setIsAnalyzing(true);

    try {
        const payloadAccounts: any[] = [];
        const batch = writeBatch(db);

        // Iterate selected composite IDs
        selectedIds.forEach(compositeId => {
            const [bureauLabel, ...rest] = compositeId.split('__');
            const safeRowId = rest.join('__'); // This ID is sanitized (no slashes)
            
            // --- DATA BRIDGE PROTOCOL ---
            
            // 1. Check Trade Lines
            // Find account where the sanitized version of its raw rowId matches our selection key
            const acc = negativeAccounts.find(a => a.rowId.replace(/[\/]/g, '_') === safeRowId);
            
            if (acc) {
                const bureauKey = bureauLabel.toLowerCase();
                const bureauData = (acc as any)[bureauKey];
                
                if (bureauData) {
                    // SANITIZATION: Ensure balance is a number
                    let cleanBalance = 0;
                    if (typeof bureauData.balance === 'number') {
                        cleanBalance = bureauData.balance;
                    } else if (typeof bureauData.balance === 'string') {
                        const numeric = parseFloat(bureauData.balance.replace(/[^0-9.-]+/g,""));
                        cleanBalance = isNaN(numeric) ? 0 : numeric;
                    }

                    const safePayload = {
                        iwc_key: compositeId, // CRITICAL: Inject ID for Backend Return Path
                        creditorName: acc.creditorName,
                        accountNumber: acc.accountNumber,
                        accountType: acc.accountType,
                        bureau: bureauLabel, // Ensure Title Case e.g. "Experian"
                        balance: cleanBalance, // Ensure Number
                        creditLimit: bureauData.creditLimit,
                        monthlyPayment: bureauData.monthlyPayment,
                        accountStatus: bureauData.accountStatus, // BRIDGE: Status Key
                        overallStatus: bureauData.overallStatus,
                        lastReported: bureauData.lastReported,
                        paymentHistory: bureauData.paymentHistory,
                        disputeStatus: bureauData.disputeStatus,
                        consultantNotesUsed: bureauData.consultantNote || '' 
                    };
                    
                    // Add CLEAN object to payload (No JSON.stringify wrapper)
                    payloadAccounts.push(safePayload);

                    // BRIDGE WRITE: Persist Status Immediately
                    const auditRef = doc(db, 'clients', client.id, 'account_audits', compositeId);
                    batch.set(auditRef, {
                        ...safePayload,
                        accountName: acc.creditorName,
                        status: 'analyzing',
                        timestamp: serverTimestamp()
                    }, { merge: true });
                }
            }

            // 2. Check Inquiries
            // Find inquiry where sanitized rowId matches
            const inq = inquiries.find(i => i.rowId.replace(/[\/]/g, '_') === safeRowId);
            
            if (inq) {
                const safePayload = {
                    iwc_key: compositeId, // CRITICAL: Inject ID
                    creditorName: inq.creditorName,
                    type: 'Hard Inquiry',
                    date: inq.dateOpened,
                    bureau: inq.bureauSource,
                    accountStatus: 'Hard Inquiry',
                    balance: 0 // Inquiries have 0 balance
                };

                // Add CLEAN object to payload
                payloadAccounts.push(safePayload);

                const auditRef = doc(db, 'clients', client.id, 'account_audits', compositeId);
                batch.set(auditRef, {
                    ...safePayload,
                    accountName: inq.creditorName,
                    status: 'analyzing',
                    timestamp: serverTimestamp()
                }, { merge: true });
            }
        });
        
        // Execute Bridge Write
        await batch.commit();

        // Run AI with clean payload
        await runForensicAudit(client.id, payloadAccounts);
        
        const newExpanded = new Set(expandedDetails);
        selectedIds.forEach(id => newExpanded.add(id));
        setExpandedDetails(newExpanded);
        setSelectedIds(new Set()); 

    } catch (e) {
        console.error("Audit Execution Failed:", e);
        alert("Forensic Auditor unavailable. Please try again.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-400">Loading Forensic Data...</div>;
  if (!report) return <div className="p-12 text-center text-slate-400">Waiting for Report Ingestion</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full animate-fade-in pb-10">
        
        {/* LEFT COLUMN: Inventory */}
        <div className="flex-[3] flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Negative Inventory</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{totalNegatives} Items Detected</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                <NewAuditListView 
                    label="Experian" items={expItems} clientId={client.id}
                    color="text-blue-600" bg="bg-blue-50" border="border-blue-100"
                    isOpen={expandedSections['Experian']} onToggle={() => toggleSection('Experian')}
                    selectedIds={selectedIds} onToggleSelection={toggleSelection}
                    expandedDetails={expandedDetails} onToggleDetail={toggleDetail}
                    onSaveNote={handleSaveNote} auditMap={auditMap}
                />
                <NewAuditListView 
                    label="Equifax" items={eqItems} clientId={client.id}
                    color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100"
                    isOpen={expandedSections['Equifax']} onToggle={() => toggleSection('Equifax')}
                    selectedIds={selectedIds} onToggleSelection={toggleSelection}
                    expandedDetails={expandedDetails} onToggleDetail={toggleDetail}
                    onSaveNote={handleSaveNote} auditMap={auditMap}
                />
                <NewAuditListView 
                    label="TransUnion" items={tuItems} clientId={client.id}
                    color="text-purple-600" bg="bg-purple-50" border="border-purple-100"
                    isOpen={expandedSections['TransUnion']} onToggle={() => toggleSection('TransUnion')}
                    selectedIds={selectedIds} onToggleSelection={toggleSelection}
                    expandedDetails={expandedDetails} onToggleDetail={toggleDetail}
                    onSaveNote={handleSaveNote} auditMap={auditMap}
                />
                <NewAuditListView 
                    label="Inquiries" items={inquiries} clientId={client.id}
                    color="text-slate-600" bg="bg-slate-100" border="border-slate-200"
                    isOpen={expandedSections['Inquiries']} onToggle={() => toggleSection('Inquiries')}
                    selectedIds={selectedIds} onToggleSelection={toggleSelection}
                    expandedDetails={expandedDetails} onToggleDetail={toggleDetail}
                    onSaveNote={handleSaveNote} isInquiryList={true} auditMap={auditMap}
                />
            </div>
        </div>

        {/* RIGHT COLUMN: Controls */}
        <div className="flex-[2] flex flex-col min-w-[320px]">
            <LiquidGlassCard className="sticky top-0 bg-white/80 border-blue-200/50 shadow-2xl backdrop-blur-xl flex flex-col gap-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg">
                        <Fingerprint size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">Forensic Console</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">gemini-3-flash-preview</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selection Count</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-slate-900">{selectedIds.size}</span>
                            <span className="text-xs font-bold text-slate-400">Items</span>
                        </div>
                    </div>
                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <div className="flex gap-3 mb-2">
                            <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-800 leading-relaxed font-medium">
                                Selected items are processed <strong>individually per bureau</strong>. Smart grouping is disabled to ensure forensic accuracy on a per-line-item basis.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <button 
                        onClick={handleRunAnalysis}
                        disabled={selectedIds.size === 0 || isAnalyzing}
                        className={`w-full py-4 rounded-[1.5rem] font-bold text-sm shadow-xl flex items-center justify-center gap-3 transition-all
                            ${selectedIds.size > 0 
                                ? 'bg-[#007AFF] text-white shadow-blue-500/30 hover:bg-blue-600 hover:scale-[1.02] active:scale-95' 
                                : 'bg-slate-100 text-slate-300 cursor-not-allowed'}
                        `}
                    >
                        {isAnalyzing ? (
                            <>
                                <Activity className="animate-spin" size={18} /> Processing Audit...
                            </>
                        ) : (
                            <>
                                <Wand2 size={18} strokeWidth={2.5} /> Run Smart Analysis
                            </>
                        )}
                    </button>
                    {selectedIds.size === 0 && (
                        <p className="text-center text-[10px] font-bold text-slate-300 mt-3 uppercase tracking-widest">Select items to enable</p>
                    )}
                </div>
            </LiquidGlassCard>
        </div>
    </div>
  );
};