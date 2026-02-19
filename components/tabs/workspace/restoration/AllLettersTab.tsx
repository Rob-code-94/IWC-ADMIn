import React, { useState, useEffect } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { Mail, Calendar, CheckCircle2, Clock, FileText, Trash2 } from 'lucide-react';
import { Client } from '@/types';
import { db } from '@/services/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { DraftingStudioView } from './LetterHub/DraftingStudioView';

export const AllLettersTab: React.FC<{ client: Client }> = ({ client }) => {
  const [letters, setLetters] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [selectedLetter, setSelectedLetter] = useState<any | null>(null);

  useEffect(() => {
      if (!client.id) return;
      const q = query(collection(db, 'clients', client.id, 'letters'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
          setLetters(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
  }, [client.id]);

  const handleDelete = async (e: React.MouseEvent, letterId: string) => {
      e.stopPropagation(); // Stop click from bubbling to card
      if (!confirm("Permanently delete this draft?")) return;
      
      try {
          await deleteDoc(doc(db, 'clients', client.id, 'letters', letterId));
      } catch (e) {
          console.error("Error deleting letter:", e);
          alert("Failed to delete letter.");
      }
  };

  const filteredLetters = filter === 'All' ? letters : letters.filter(l => l.bureau === filter);

  // Helper for date formatting
  const formatDate = (timestamp: any) => {
      if (!timestamp) return 'Draft';
      return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
      });
  };

  if (selectedLetter) {
      return (
          <DraftingStudioView 
              client={client} 
              initialLetter={selectedLetter} 
              onBack={() => setSelectedLetter(null)} 
              mode="standalone"
          />
      );
  }

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Filter Bar */}
        <div className="flex gap-2 overflow-x-auto pb-2">
            {['All', 'Experian', 'Equifax', 'TransUnion'].map(f => (
                <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap
                        ${filter === f ? 'bg-slate-900 text-white shadow-md' : 'bg-white/50 text-slate-500 hover:bg-white'}
                    `}
                >
                    {f}
                </button>
            ))}
        </div>

        {/* Bento Grid Feed */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLetters.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-400 font-medium">
                    {letters.length === 0 ? "No letters created yet." : "No letters found for this filter."}
                </div>
            ) : (
                filteredLetters.map((letter) => (
                    <LiquidGlassCard 
                        key={letter.id} 
                        onClick={() => setSelectedLetter(letter)}
                        className="relative group overflow-hidden hover:scale-[1.02] transition-transform cursor-pointer"
                    >
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-200 group-hover:bg-[#007AFF] transition-colors"></div>
                        <div className="pl-4">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                                        <Mail size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{letter.bureau}</h4>
                                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{letter.round || 'Custom Draft'}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1
                                        ${letter.status === 'Sent' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}
                                    `}>
                                        {letter.status === 'Sent' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                        {letter.status}
                                    </span>
                                    
                                    {/* Delete Button */}
                                    <button 
                                        onClick={(e) => handleDelete(e, letter.id)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                                        title="Delete Draft"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                    <span className="flex items-center gap-1"><Calendar size={12} /> Date Created</span>
                                    <span className="font-semibold text-slate-700">{formatDate(letter.createdAt)}</span>
                                </div>
                                 <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>Targeted Items</span>
                                    <span className="font-semibold text-slate-700">{letter.items || 0} Accounts</span>
                                </div>
                            </div>
                        </div>
                    </LiquidGlassCard>
                ))
            )}
        </div>
    </div>
  );
};