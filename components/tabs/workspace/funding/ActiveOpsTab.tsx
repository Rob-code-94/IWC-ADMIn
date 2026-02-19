import React, { useState, useEffect, useRef } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { 
    ArrowLeft, CheckCircle2, Circle, Building2, Save, 
    User, Loader2, Paperclip, Mic, Plus, Trash2, ExternalLink,
    ChevronDown, ChevronUp, Image as ImageIcon, UploadCloud, X
} from 'lucide-react';
import { Client } from '@/types';
import { db, storage, subscribeToReadiness, updateReadinessItem } from '@/services/firebase';
import { collection, query, onSnapshot, doc, setDoc, addDoc, serverTimestamp, orderBy, deleteDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FundingProfileCard } from './FundingProfileCard';
import { AddLenderToOpsModal } from './AddLenderToOpsModal';
import { VoiceTextArea } from '@/components/ui/VoiceTextArea';

interface ActiveLender {
    id: string;
    institution_name: string;
    name?: string; 
    bureau?: string;
    bureaus?: { experian: boolean; equifax: boolean; transUnion: boolean; };
    status: string; 
    applicationId?: string;
    requestedAmount?: string;
    approvedAmount?: string;
    screenshots?: string[];
    lastSessionUpdate?: any;
    createdAt?: any;
    origin?: 'ops' | 'banking'; 
}

interface SessionLog {
    id: string;
    status: string;
    notes: string;
    timestamp: any;
    screenshots?: string[];
    approvedAmount?: string;
}

export const ActiveOpsTab: React.FC<{ client: Client }> = ({ client }) => {
  const [activeLenders, setActiveLenders] = useState<ActiveLender[]>([]);
  const [selectedLender, setSelectedLender] = useState<ActiveLender | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  
  const [sessionForm, setSessionForm] = useState({ 
      appId: '', 
      amount: '', 
      approvedAmount: '',
      status: 'Applied',
      notes: '',
      screenshots: [] as string[]
  });
  
  const [readinessData, setReadinessData] = useState<Record<string, boolean>>({});
  const [showReadiness, setShowReadiness] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const READINESS_ITEMS = [
    { id: 'fraud_alerts', label: 'Fraud Alerts Removed' },
    { id: 'income_verified', label: 'Income Verified' },
    { id: 'address_standardized', label: 'Address Standardized' },
    { id: 'freeze_thawed', label: 'Freeze Thawed' }
  ];

  // 1. Subscribe ONLY to Active Ops (Operational Desk)
  useEffect(() => {
    if (!client.id) return;
    const q = query(collection(db, 'clients', client.id, 'active_ops'));
    return onSnapshot(q, (snap) => {
        setActiveLenders(snap.docs.map(d => ({ 
            id: d.id, 
            ...d.data(), 
            origin: d.data().addedVia?.includes('banking') ? 'banking' : 'ops' 
        } as ActiveLender)));
    });
  }, [client.id]);

  useEffect(() => {
    if (!client.id) return;
    return subscribeToReadiness(client.id, (data) => setReadinessData(data || {}));
  }, [client.id]);

  useEffect(() => {
      if (!selectedLender || !client.id) return;
      const q = query(collection(db, 'clients', client.id, 'active_ops', selectedLender.id, 'funding_sessions'), orderBy('timestamp', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
          setSessionLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as SessionLog)));
      });
      return () => unsub();
  }, [selectedLender, client.id]);

  const handleToggleReadiness = async (itemId: string) => {
    const newValue = !readinessData[itemId];
    await updateReadinessItem(client.id, itemId, newValue);
  };

  const handleWithdraw = async () => {
    if (!selectedLender) return;
    if (!confirm(`Remove ${selectedLender.institution_name || selectedLender.name} from operational desk?`)) return;
    
    setIsSaving(true);
    try {
        // DELETE OPS
        const opsRef = doc(db, 'clients', client.id, 'active_ops', selectedLender.id);
        await deleteDoc(opsRef);
        
        // DELETE BANKING MIRROR (To prevent ghosting)
        const bankRef = doc(db, 'clients', client.id, 'banking_relationships', selectedLender.id);
        await deleteDoc(bankRef);
        
        setSelectedLender(null);
    } catch (e) {
        console.error("Error removing lender:", e);
    } finally {
        setIsSaving(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && selectedLender) {
        setIsUploading(true);
        const files = Array.from(e.target.files) as File[];
        const newUrls: string[] = [];
        
        try {
            for (const file of files) {
                const storageRef = ref(storage, `clients/${client.id}/active_ops/${selectedLender.id}/screenshots/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                newUrls.push(url);
            }
            setSessionForm(prev => ({
                ...prev,
                screenshots: [...prev.screenshots, ...newUrls]
            }));
        } catch (err) {
            console.error("Upload failed", err);
            alert("Failed to upload screenshots.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }
  };

  const handleRemoveScreenshot = (indexToRemove: number) => {
      setSessionForm(prev => ({
          ...prev,
          screenshots: prev.screenshots.filter((_, idx) => idx !== indexToRemove)
      }));
  };

  const handleSaveSession = async () => {
    if (!selectedLender) return;
    setIsSaving(true);
    try {
        // 1. Log Session
        await addDoc(collection(db, 'clients', client.id, 'active_ops', selectedLender.id, 'funding_sessions'), {
            applicationId: sessionForm.appId,
            requestedAmount: sessionForm.amount,
            approvedAmount: sessionForm.approvedAmount,
            status: sessionForm.status,
            notes: sessionForm.notes,
            screenshots: sessionForm.screenshots,
            timestamp: serverTimestamp(),
            type: 'operational_log'
        });

        // 2. Update Active Ops Document
        await setDoc(doc(db, 'clients', client.id, 'active_ops', selectedLender.id), {
            applicationId: sessionForm.appId,
            requestedAmount: sessionForm.amount,
            approvedAmount: sessionForm.approvedAmount,
            status: sessionForm.status,
            screenshots: sessionForm.screenshots, 
            lastSessionUpdate: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });

        // OPTIONAL: Sync status back to Banking Relationship if it exists
        if (selectedLender.origin === 'banking') {
             await setDoc(doc(db, 'clients', client.id, 'banking_relationships', selectedLender.id), {
                 status: sessionForm.status,
                 updatedAt: serverTimestamp()
             }, { merge: true });
        }

        setSessionForm(prev => ({ ...prev, notes: '' }));
    } catch (e) { 
        console.error(e); 
        alert("Failed to log session.");
    } finally { 
        setIsSaving(false); 
    }
  };

  const bureaus = ['Experian', 'Equifax', 'TransUnion'];

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 animate-fade-in overflow-hidden font-sans">
        <AddLenderToOpsModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} clientId={client.id} targetCollection="active_ops" />

        <div className="flex-1 flex flex-col min-h-0">
            {!selectedLender ? (
                <div className="flex flex-col h-full space-y-6">
                    <div className="px-2 flex-shrink-0 flex justify-between items-end">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 tracking-tight uppercase leading-none">Active Ops Command</h2>
                            <p className="text-sm text-slate-500 font-medium mt-2">Managing {activeLenders.length} active targets.</p>
                        </div>
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="p-3.5 bg-[#007AFF] text-white rounded-full shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all"
                        >
                            <Plus size={24} strokeWidth={2.5} />
                        </button>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
                        {bureaus.map(bureau => {
                            const list = activeLenders.filter(l => {
                                const b = l.bureaus;
                                const legacy = l.bureau?.toLowerCase() || '';
                                const match = (bureau === 'Experian' && (b?.experian || legacy.includes('experian'))) ||
                                              (bureau === 'Equifax' && (b?.equifax || legacy.includes('equifax'))) ||
                                              (bureau === 'TransUnion' && (b?.transUnion || legacy.includes('transunion')));
                                return match;
                            });

                            return (
                                <div key={bureau} className="flex flex-col h-full space-y-4">
                                    <div className="flex items-center justify-between px-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${bureau === 'Experian' ? 'bg-blue-600' : bureau === 'Equifax' ? 'bg-emerald-500' : 'bg-purple-500'}`} />
                                            <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">{bureau} Ops</h3>
                                        </div>
                                        <span className="text-[10px] font-semibold text-slate-400">{list.length}</span>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 px-1">
                                        {list.length === 0 ? (
                                            <div className="py-20 text-center border border-dashed border-slate-200 rounded-[2rem] bg-white/40 flex flex-col items-center justify-center">
                                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Desk Empty</p>
                                            </div>
                                        ) : (
                                            list.map(l => (
                                                <LiquidGlassCard 
                                                    key={`${bureau}-ops-${l.id}`} 
                                                    onClick={() => {
                                                        setSelectedLender(l);
                                                        setSessionForm({
                                                            appId: l.applicationId || '',
                                                            amount: l.requestedAmount || '',
                                                            approvedAmount: l.approvedAmount || '',
                                                            status: l.status || 'Applied',
                                                            notes: '',
                                                            screenshots: l.screenshots || []
                                                        });
                                                    }} 
                                                    className="!p-5 cursor-pointer hover:bg-white transition-all shadow-sm group"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-slate-900 text-[15px] truncate uppercase flex-1">{l.institution_name || l.name}</h4>
                                                        {l.status && (
                                                            <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ml-2
                                                                ${l.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                                                                  l.status === 'Denied' ? 'bg-red-100 text-red-700' : 
                                                                  l.status === 'Pending' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}
                                                            `}>
                                                                {l.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[9px] font-semibold text-slate-400 uppercase mt-2">
                                                        {l.origin === 'banking' ? 'From Library' : (l.applicationId ? `#${l.applicationId}` : 'Applied')}
                                                    </p>
                                                </LiquidGlassCard>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-6 animate-fade-in-up h-full overflow-hidden">
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <button onClick={() => setSelectedLender(null)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-sm transition-all"><ArrowLeft size={20} /></button>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">{selectedLender.institution_name || selectedLender.name}</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                        <LiquidGlassCard className="space-y-6 bg-white shadow-lg border-blue-100 mb-6 relative z-10">
                            
                            {/* ROW 1: Status & App ID */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-widest">Application Status</label>
                                    <select 
                                        value={sessionForm.status}
                                        onChange={e => setSessionForm({...sessionForm, status: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                                    >
                                        <option value="Applied">Applied</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Approved">Approved</option>
                                        <option value="Denied">Denied</option>
                                        <option value="Interested">Interested</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-widest">Application ID</label>
                                    <input 
                                        value={sessionForm.appId} 
                                        onChange={e => setSessionForm({...sessionForm, appId: e.target.value})} 
                                        placeholder="#APP-XXXX" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-semibold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none" 
                                    />
                                </div>
                            </div>

                            {/* ROW 2: Amounts */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-widest">Ask Amount</label>
                                    <input 
                                        value={sessionForm.amount} 
                                        onChange={e => setSessionForm({...sessionForm, amount: e.target.value})} 
                                        placeholder="$0.00" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-semibold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-emerald-500 uppercase ml-1 tracking-widest">Approved Amount</label>
                                    <input 
                                        value={sessionForm.approvedAmount} 
                                        onChange={e => setSessionForm({...sessionForm, approvedAmount: e.target.value})} 
                                        placeholder="$0.00" 
                                        className="w-full bg-emerald-50/50 border border-emerald-100 rounded-2xl px-5 py-4 text-sm font-bold text-emerald-700 placeholder:text-emerald-300 focus:ring-4 focus:ring-emerald-500/10 outline-none" 
                                    />
                                </div>
                            </div>

                            {/* ROW 3: Screenshots */}
                            <div className="space-y-3 pt-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <ImageIcon size={12} /> Application Evidence
                                    </label>
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors flex items-center gap-1 disabled:opacity-50"
                                    >
                                        {isUploading ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} strokeWidth={3} />}
                                        {isUploading ? 'Uploading...' : 'Add Photos'}
                                    </button>
                                    <input 
                                        type="file" 
                                        multiple 
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                    />
                                </div>
                                
                                {sessionForm.screenshots.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {sessionForm.screenshots.map((url, idx) => (
                                            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
                                                <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <a href={url} target="_blank" rel="noreferrer" className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors">
                                                        <ExternalLink size={14} />
                                                    </a>
                                                    <button 
                                                        onClick={() => handleRemoveScreenshot(idx)}
                                                        className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full text-white backdrop-blur-sm transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-500 transition-all group"
                                        >
                                            <UploadCloud size={20} className="group-hover:scale-110 transition-transform" />
                                            <span className="text-[9px] font-bold uppercase">Add More</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2 group-hover:bg-blue-100 group-hover:text-blue-600 text-slate-400 transition-colors">
                                            <ImageIcon size={20} />
                                        </div>
                                        <p className="text-xs font-bold text-slate-600">No screenshots added</p>
                                        <p className="text-[10px] text-slate-400">Click to upload confirmation images</p>
                                    </div>
                                )}
                            </div>

                            {/* ROW 4: Notes (Voice Enabled) */}
                            <div className="space-y-2 pt-2">
                                 <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Underwriter Sync Logs</label>
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-[#007AFF]"><Mic size={12} /> Voice Protocols Active</span>
                                 </div>
                                 <VoiceTextArea 
                                    value={sessionForm.notes} 
                                    onChange={e => setSessionForm({...sessionForm, notes: e.target.value})} 
                                    placeholder="Log precise details about the call (dates, agent names, next steps)..." 
                                    className="h-32 border-slate-200"
                                 />
                            </div>

                            {/* Footer Actions */}
                            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                <button onClick={handleWithdraw} disabled={isSaving} className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-widest px-4 py-2 hover:bg-red-50 rounded-lg transition-colors">
                                    Remove from Desk
                                </button>
                                <button onClick={handleSaveSession} disabled={isSaving} className="flex items-center gap-2 px-10 py-4 bg-slate-900 text-white rounded-full font-bold text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:scale-105 transition-all active:scale-95">
                                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Finalize Sync
                                </button>
                            </div>
                        </LiquidGlassCard>

                        {/* SESSION HISTORY FEED */}
                        {sessionLogs.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] px-2">Operational Log</h3>
                                {sessionLogs.map(log => (
                                    <div key={log.id} className="bg-white/40 border border-white/60 p-4 rounded-2xl flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-2 items-center">
                                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md
                                                    ${log.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                                      log.status === 'Denied' ? 'bg-red-100 text-red-700' :
                                                      'bg-blue-50 text-blue-600'}
                                                `}>{log.status}</span>
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Just now'}
                                                </span>
                                            </div>
                                            {(log.screenshots?.length || 0) > 0 && (
                                                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                                    <ImageIcon size={10} /> {log.screenshots?.length}
                                                </span>
                                            )}
                                        </div>
                                        {log.notes && (
                                            <p className="text-xs text-slate-600 font-medium leading-relaxed bg-white/50 p-2 rounded-lg border border-white/50">
                                                "{log.notes}"
                                            </p>
                                        )}
                                        {log.approvedAmount && (
                                            <p className="text-[10px] font-bold text-emerald-600">Approved: {log.approvedAmount}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        <div className="w-full lg:w-80 flex-shrink-0 space-y-6 pb-20 overflow-y-auto custom-scrollbar">
            <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-[2.5rem] overflow-hidden shadow-sm">
                <button onClick={() => setShowReadiness(!showReadiness)} className="w-full p-5 bg-slate-100/50 border-b border-white/40 flex items-center justify-between group transition-colors hover:bg-slate-200/50">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-slate-400" />
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Readiness Audit</span>
                    </div>
                    {showReadiness ? <ChevronUp size={14} className="text-slate-300" /> : <ChevronDown size={14} className="text-slate-300" />}
                </button>
                {showReadiness && (
                  <div className="p-5 space-y-1 animate-fade-in">
                      {READINESS_ITEMS.map((item) => {
                          const isChecked = readinessData[item.id] === true;
                          return (
                            <div key={item.id} onClick={() => handleToggleReadiness(item.id)} className="flex items-center gap-3 p-2 hover:bg-white/50 rounded-xl cursor-pointer transition-colors group">
                                <div className={isChecked ? 'text-emerald-500' : 'text-slate-300'}>{isChecked ? <CheckCircle2 size={18} /> : <Circle size={18} />}</div>
                                <span className={`text-xs font-semibold tracking-tight transition-all ${isChecked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.label}</span>
                            </div>
                          );
                      })}
                  </div>
                )}
            </div>
            <FundingProfileCard client={client} />
        </div>
    </div>
  );
};