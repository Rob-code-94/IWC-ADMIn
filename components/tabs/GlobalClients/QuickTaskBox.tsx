import React, { useState } from 'react';
import { db } from '@/services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { Plus, CheckCircle2, Loader2, Zap } from 'lucide-react';

export const QuickTaskBox = ({ clientId }: { clientId: string }) => {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Restoration');
    const [isSaving, setIsSaving] = useState(false);

    const handleCreateTask = async () => {
        if (!title.trim() || !clientId) return;
        setIsSaving(true);
        try {
            await addDoc(collection(db, 'clients', clientId, 'tasks'), {
                title: title.trim(),
                category: category,
                status: 'Todo',
                priority: 'High', // Defaulting to high as this is the profile action hub
                createdAt: serverTimestamp(),
                dueDate: new Date().toISOString().split('T')[0] + 'T12:00:00'
            });
            setTitle('');
        } catch (e) {
            console.error("Task push failed:", e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <LiquidGlassCard className="p-8 h-full flex flex-col justify-between border-blue-500/20 bg-blue-50/10">
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-2">
                        <Zap size={14} fill="currentColor" /> Operational Task
                    </h3>
                </div>
                
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-widest">Task Title</label>
                        <input 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Call for Dispute Status..."
                            className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-5 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-widest">Category</label>
                        <select 
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none cursor-pointer"
                        >
                            <option>Restoration</option>
                            <option>Funding</option>
                            <option>Onboarding</option>
                            <option>Consulting</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <button 
                onClick={handleCreateTask}
                disabled={isSaving || !title.trim()}
                className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-bold text-sm shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 transition-all hover:bg-slate-800"
            >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} strokeWidth={3} />}
                Create Priority Task
            </button>
        </LiquidGlassCard>
    );
};