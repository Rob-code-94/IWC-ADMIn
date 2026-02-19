import React, { useState, useEffect } from 'react';
import { Client } from '@/types';
import { ICONS } from '@/constants';
import { db } from '@/services/firebase';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { Edit2, Save, X, TrendingUp, TrendingDown, Minus, Copy, Settings, Check } from 'lucide-react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { ClientSettingsModal } from '@/components/modals/ClientSettingsModal';
import { useClients } from '@/context/ClientContext';

interface WorkspaceHeaderProps {
  client: Client;
  onBack: () => void;
}

interface ScoreData {
  bureau: 'Experian' | 'TransUnion' | 'Equifax';
  score: number;
  status?: string;
}

interface AnalysisReport {
  scores: ScoreData[];
  generatedAt?: any;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({ client, onBack }) => {
  const { updateClientData, deleteClientData } = useClients();
  const [analysis, setAnalysis] = useState<AnalysisReport | null>(null);
  const [isEditingScores, setIsEditingScores] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editValues, setEditValues] = useState<{ experian: string; transUnion: string; equifax: string }>({
    experian: '', transUnion: '', equifax: ''
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // SCORE SYNC ENGINE: Path Enforcement -> /clients/{id}/reports/latest_analysis
  useEffect(() => {
    if (!client.id) return;
    
    const unsub = onSnapshot(doc(db, 'clients', client.id, 'reports', 'latest_analysis'), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as AnalysisReport;
            setAnalysis(data);
            
            // Map for local edit state
            const scoresMap = { experian: '', transUnion: '', equifax: '' };
            data.scores?.forEach(s => {
                if (s.bureau === 'Experian') scoresMap.experian = s.score.toString();
                if (s.bureau === 'TransUnion') scoresMap.transUnion = s.score.toString();
                if (s.bureau === 'Equifax') scoresMap.equifax = s.score.toString();
            });
            setEditValues(scoresMap);
        } else {
            // Fallback to client root prop if analysis doesn't exist yet, but initialize empty structure
            setAnalysis({ scores: [] });
            setEditValues({
                experian: client.scores?.experian?.toString() || '',
                transUnion: client.scores?.transUnion?.toString() || '',
                equifax: client.scores?.equifax?.toString() || ''
            });
        }
    });

    return () => unsub();
  }, [client.id, client.scores]);

  const handleSaveScores = async () => {
    try {
        const newScoresArray: ScoreData[] = [
            { bureau: 'Experian', score: parseInt(editValues.experian) || 0 },
            { bureau: 'TransUnion', score: parseInt(editValues.transUnion) || 0 },
            { bureau: 'Equifax', score: parseInt(editValues.equifax) || 0 },
        ];

        // Write to Source of Truth
        await setDoc(doc(db, 'clients', client.id, 'reports', 'latest_analysis'), {
            scores: newScoresArray,
            updatedAt: new Date(), // Manual override timestamp
            manualOverride: true
        }, { merge: true });

        // Optional: Sync back to root client for fast list views (Cloud Function usually does this, but we do it here for immediacy)
        await updateDoc(doc(db, 'clients', client.id), {
            scores: {
                experian: parseInt(editValues.experian) || null,
                transUnion: parseInt(editValues.transUnion) || null,
                equifax: parseInt(editValues.equifax) || null
            }
        });

        setIsEditingScores(false);
    } catch (e) {
        console.error("Failed to update scores:", e);
    }
  };

  const handleCopy = (text: string | undefined, field: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
  };

  const handleClientDelete = async (id: string) => {
      await deleteClientData(id);
      setIsSettingsOpen(false);
      onBack();
  };

  // Helper to extract score for display
  const getScore = (bureau: string) => {
    const found = analysis?.scores?.find(s => s.bureau === bureau);
    return found?.score || '-';
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 animate-fade-in-down gap-6">
      
      <ClientSettingsModal 
        client={client}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdate={updateClientData}
        onDelete={handleClientDelete}
      />

      {/* IDENTITY BLOCK */}
      <div className="flex items-center gap-5">
        <button 
            onClick={onBack}
            className="w-12 h-12 rounded-full bg-white/60 hover:bg-white flex items-center justify-center text-slate-600 hover:text-blue-600 transition-all border border-white/50 shadow-sm"
        >
            {ICONS['chevron-left']}
        </button>
        <div>
            <div className="flex items-center gap-4">
                <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{client.firstName} {client.lastName}</h1>
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border shadow-sm
                    ${client.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : 
                      client.status === 'Dispute' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      'bg-slate-100 text-slate-600 border-slate-200'}
                `}>
                    {client.status}
                </span>
                
                {/* Settings Gear */}
                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-all"
                    title="Edit Client Settings"
                >
                    <Settings size={20} />
                </button>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 mt-2">
                {/* Email */}
                <div className="flex items-center gap-1.5 text-slate-500 font-medium text-sm group cursor-pointer" onClick={() => handleCopy(client.email, 'email')}>
                    <span>{client.email}</span>
                    <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-all scale-90">
                        {copiedField === 'email' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                </div>
                
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                
                {/* Phone */}
                <div className="flex items-center gap-1.5 text-slate-500 font-medium text-sm group cursor-pointer" onClick={() => handleCopy(client.phone, 'phone')}>
                    <span>{client.phone}</span>
                    <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-all scale-90">
                        {copiedField === 'phone' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* SCORE SYNC ENGINE DISPLAY */}
      <div className="flex items-center gap-4">
         {isEditingScores ? (
             <LiquidGlassCard className="flex items-center gap-3 !p-4 bg-white/90 border-blue-200 shadow-xl scale-105 transition-all">
                 <div className="flex gap-4">
                     {['Experian', 'TransUnion', 'Equifax'].map(b => (
                         <div key={b} className="flex flex-col w-24">
                             <label className="text-[10px] font-bold text-slate-400 uppercase text-center mb-2">{b.slice(0,3)}</label>
                             <input 
                                type="number" 
                                className="w-full bg-slate-100 border-none rounded-xl py-2 text-center font-black text-xl focus:ring-2 focus:ring-blue-500/20"
                                value={editValues[b.toLowerCase().replace('transunion','transUnion') as keyof typeof editValues]}
                                onChange={(e) => setEditValues(prev => ({ ...prev, [b.toLowerCase().replace('transunion','transUnion')]: e.target.value }))}
                             />
                         </div>
                     ))}
                 </div>
                 <div className="flex flex-col gap-2 border-l border-slate-200 pl-4">
                     <button onClick={handleSaveScores} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md"><Save size={18} /></button>
                     <button onClick={() => setIsEditingScores(false)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"><X size={18} /></button>
                 </div>
             </LiquidGlassCard>
         ) : (
             <div className="flex items-center gap-4 group relative">
                 {/* Edit Trigger */}
                 <button 
                    onClick={() => setIsEditingScores(true)}
                    className="absolute -top-4 -right-4 w-8 h-8 bg-white rounded-full text-slate-400 shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all hover:text-blue-600 hover:border-blue-200 z-10"
                    title="Edit Scores"
                 >
                     <Edit2 size={14} />
                 </button>

                 {/* Score Pills - Increased Size */}
                 <div className="flex -space-x-4 hover:space-x-3 transition-all duration-300">
                     {[
                         { bureau: 'Experian', color: 'border-blue-100 text-blue-900', label: 'EXP' },
                         { bureau: 'TransUnion', color: 'border-purple-100 text-purple-900', label: 'TU' },
                         { bureau: 'Equifax', color: 'border-emerald-100 text-emerald-900', label: 'EQ' }
                     ].map((item, idx) => {
                         const score = getScore(item.bureau);
                         return (
                             <div 
                                key={item.bureau}
                                className={`relative w-20 h-20 rounded-3xl bg-white border-2 flex flex-col items-center justify-center shadow-xl transition-transform hover:scale-110 hover:z-20 z-${10 - idx} ${item.color}`}
                             >
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-0.5">{item.label}</span>
                                <span className="text-2xl font-black tracking-tighter">{score}</span>
                                
                                {/* Delta Indicator (Simulated) */}
                                {score !== '-' && (
                                    <div className="absolute -bottom-2 flex items-center justify-center w-6 h-6 rounded-full bg-slate-50 border border-slate-100 shadow-sm">
                                        <Minus size={12} className="text-slate-300" />
                                    </div>
                                )}
                             </div>
                         );
                     })}
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};