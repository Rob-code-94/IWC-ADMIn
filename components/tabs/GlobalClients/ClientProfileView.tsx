import React, { useState, useEffect } from 'react';
import { ExternalLink, Settings, ShieldAlert, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { Client, ClientTask } from '@/types';
import { QuickTaskBox } from './QuickTaskBox';
import { ClientSettingsModal } from '@/components/modals/ClientSettingsModal';
import { useClients } from '@/context/ClientContext';
import { db } from '@/services/firebase';
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { TaskItem } from '../workspace/tasks/TaskItem';

// SCORE SYNC ENGINE Types
interface ScoreData {
  bureau: 'Experian' | 'TransUnion' | 'Equifax';
  score: number;
}

interface AnalysisReport {
  scores: ScoreData[];
}

export const ClientProfileView: React.FC<{ client: Client, onOpenWorkspace: (c: Client) => void }> = ({ client, onOpenWorkspace }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { updateClientData, deleteClientData } = useClients();
  const [analysis, setAnalysis] = useState<AnalysisReport | null>(null);
  const [priorityTasks, setPriorityTasks] = useState<ClientTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // SCORE SYNC ENGINE: Path Enforcement -> /clients/{id}/reports/latest_analysis
  useEffect(() => {
    if (!client.id) return;
    
    const unsub = onSnapshot(doc(db, 'clients', client.id, 'reports', 'latest_analysis'), (docSnap) => {
        if (docSnap.exists()) {
            setAnalysis(docSnap.data() as AnalysisReport);
        } else {
            setAnalysis(null);
        }
    });

    return () => unsub();
  }, [client.id]);

  // URGENT TASK FEED: Optimized to avoid composite index requirements
  useEffect(() => {
    if (!client.id) return;
    setLoadingTasks(true);
    
    // Fetch all tasks sorted by date, then filter in memory to avoid Firestore index errors
    const q = query(
        collection(db, 'clients', client.id, 'tasks'),
        orderBy('createdAt', 'desc')
    );
    
    const unsubTasks = onSnapshot(q, (snapshot) => {
        const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientTask));
        const filtered = allTasks.filter(t => t.priority === 'High' && t.status !== 'Complete');
        setPriorityTasks(filtered);
        setLoadingTasks(false);
    });

    return () => unsubTasks();
  }, [client.id]);

  const getScore = (bureau: string) => {
    const found = analysis?.scores?.find(s => s.bureau === bureau);
    if (found) return found.score;
    if (bureau === 'Experian') return client.scores?.experian ?? '---';
    if (bureau === 'Equifax') return client.scores?.equifax ?? '---';
    if (bureau === 'TransUnion') return client.scores?.transUnion ?? '---';
    return '---';
  };

  const handleClientDelete = async (id: string) => {
    await deleteClientData(id);
    setIsSettingsOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar pr-2 pt-2">
        <ClientSettingsModal 
            client={client}
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onUpdate={updateClientData}
            onDelete={handleClientDelete}
        />

        {/* HEADER AREA */}
        <div className="flex justify-between items-end mb-8 pb-4 border-b border-slate-200/50">
            <div>
                <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider border shadow-sm
                        ${client.status === 'Active' ? 'bg-emerald-100 text-emerald-600 border-emerald-200/50' : 
                          client.status === 'Dispute' ? 'bg-blue-100 text-blue-600 border-blue-200/50' :
                          client.status === 'Archived' ? 'bg-slate-100 text-slate-400 border-slate-200' :
                          'bg-slate-100 text-slate-600 border-slate-200/50'}
                    `}>
                        {client.status}
                    </span>
                </div>
                <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none">
                    {client.name || `${client.firstName} ${client.lastName}`}
                </h1>
            </div>

            <div className="flex gap-3">
                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="w-14 h-14 rounded-full bg-white/60 hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm border border-white/60 group"
                >
                    <Settings size={24} strokeWidth={2} className="group-hover:rotate-90 transition-transform duration-500" />
                </button>

                <button 
                    onClick={() => onOpenWorkspace(client)} 
                    className="bg-[#007AFF] text-white px-8 py-4 rounded-full font-bold flex items-center gap-2 shadow-xl shadow-blue-500/30 hover:bg-blue-600 hover:scale-[1.02] transition-all active:scale-95"
                >
                    <ExternalLink size={18} strokeWidth={3} />
                    Open Workspace
                </button>
            </div>
        </div>

        {/* RESTRUCTURED BENTO GRID */}
        <div className="grid grid-cols-12 gap-6 pb-20">
            
            {/* TOP ROW: IDENTITY & SCORES */}
            <LiquidGlassCard className="col-span-12 lg:col-span-4 p-8 flex flex-col gap-6 bg-white/60">
                <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Personal Identity</h3>
                    <button onClick={() => setIsSettingsOpen(true)} className="text-[#007AFF] text-[10px] font-black uppercase hover:underline">Edit</button>
                </div>
                
                <div className="space-y-5">
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Verified Email</p>
                        <p className="text-base font-bold text-slate-900 break-all">{client.email}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Primary Phone</p>
                        <p className="text-base font-bold text-slate-900">{client.phone}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Home Address</p>
                        <p className="text-base font-bold text-slate-900 leading-tight">{client.address || '---'}</p>
                    </div>
                    <div className="flex gap-8">
                         <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">DOB</p>
                            <p className="text-base font-bold text-slate-900">{client.dob || '---'}</p>
                         </div>
                         <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">SSN (L4)</p>
                            <p className="text-base font-bold text-slate-900 font-mono tracking-widest">{client.ssn ? `•••• ${client.ssn}` : '---'}</p>
                         </div>
                    </div>
                </div>
            </LiquidGlassCard>

            <LiquidGlassCard className="col-span-12 lg:col-span-8 p-8 bg-blue-50/30 border-blue-100 flex flex-col">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#007AFF] mb-8">Credit Score Snapshot</h4>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ScoreCard label="Experian" score={getScore('Experian')} color="text-blue-600" />
                    <ScoreCard label="Equifax" score={getScore('Equifax')} color="text-emerald-600" />
                    <ScoreCard label="TransUnion" score={getScore('TransUnion')} color="text-purple-600" />
                </div>
            </LiquidGlassCard>

            {/* MIDDLE ROW: QUICK TASK */}
            <div className="col-span-12 lg:col-span-4 h-[320px]">
                <QuickTaskBox clientId={client.id} />
            </div>

            {/* SPACER/EMPTY FOR SYMMETRY - Can be filled with notes later */}
            <div className="col-span-12 lg:col-span-8 h-[320px] rounded-[2.5rem] border border-dashed border-slate-200 flex items-center justify-center bg-white/20">
                <div className="text-center opacity-30">
                    <CheckCircle2 className="mx-auto mb-2 text-slate-400" size={32} />
                    <p className="text-xs font-black uppercase tracking-widest">Placeholder / Future Modules</p>
                </div>
            </div>

            {/* BOTTOM ROW: FULL WIDTH HIGH PRIORITY FEED */}
            <div className="col-span-12 space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">High Priority Action Required</h3>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{priorityTasks.length}</span>
                </div>
                
                {loadingTasks ? (
                    <div className="py-20 text-center text-slate-400 font-bold animate-pulse">Scanning priorities...</div>
                ) : priorityTasks.length === 0 ? (
                    <LiquidGlassCard className="py-16 text-center bg-white/40 border-dashed border-slate-200">
                        <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={48} />
                        <h4 className="text-xl font-bold text-slate-900">Clean Slate</h4>
                        <p className="text-sm text-slate-500 mt-1">No urgent tasks currently assigned to this environment.</p>
                    </LiquidGlassCard>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {priorityTasks.map(task => (
                            <TaskItem 
                                key={task.id} 
                                task={task} 
                                onToggle={() => {}} // Handle inside item or refetch
                                onDelete={() => {}} 
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

const ScoreCard = ({ label, score, color }: any) => (
    <div className="flex flex-col justify-center items-center p-6 bg-white border border-blue-50 rounded-[2rem] shadow-sm transition-all hover:scale-[1.02] hover:shadow-md">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{label}</span>
        <span className={`text-4xl font-black ${color}`}>{score}</span>
    </div>
);