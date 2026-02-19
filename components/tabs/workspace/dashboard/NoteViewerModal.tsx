import React from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { X, Calendar } from 'lucide-react';
import { ClientNote } from '@/types';

interface NoteViewerModalProps {
  note: ClientNote | null;
  onClose: () => void;
}

export const NoteViewerModal: React.FC<NoteViewerModalProps> = ({ note, onClose }) => {
  if (!note) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <LiquidGlassCard className="w-full max-w-2xl relative z-10 !p-0 overflow-hidden shadow-2xl animate-fade-in-up max-h-[80vh] flex flex-col">
         <div className="p-6 border-b border-white/40 bg-white/80 backdrop-blur-md flex justify-between items-start">
             <div>
                 <h3 className="font-bold text-slate-900 text-xl leading-snug">{note.title || 'Untitled Note'}</h3>
                 <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
                    <Calendar size={12} />
                    {note.createdAt?.seconds 
                        ? new Date(note.createdAt.seconds * 1000).toLocaleString() 
                        : 'Just now'}
                 </p>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                 <X size={20} />
             </button>
         </div>

         <div className="p-8 bg-slate-50/50 overflow-y-auto custom-scrollbar flex-1">
             <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
                 {note.content}
             </div>
         </div>
      </LiquidGlassCard>
    </div>
  );
};