import React, { useState } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { CheckSquare, Wand2, FileText, ChevronRight, PenTool } from 'lucide-react';
import { Client } from '@/types';
import { AuditAnalysisView } from './LetterHub/AuditAnalysisView';
import { DraftingStudioView } from './LetterHub/DraftingStudioView';

type LetterMode = 'audit' | 'drafting';

export const LetterHubTab: React.FC<{ client: Client }> = ({ client }) => {
  const [mode, setMode] = useState<LetterMode>('audit');

  return (
    <div className="h-full animate-fade-in flex flex-col">
      
      {/* Sub-Nav for Mode Switching */}
      <div className="flex justify-center mb-6 flex-shrink-0">
        <div className="bg-slate-200/50 p-1 rounded-full flex gap-1 border border-white/40">
            <button 
                onClick={() => setMode('audit')}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${mode === 'audit' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Audit & Analysis
            </button>
            <button 
                onClick={() => setMode('drafting')}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${mode === 'drafting' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Drafting Studio
            </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {mode === 'audit' ? (
            <AuditAnalysisView client={client} />
        ) : (
            <DraftingStudioView client={client} />
        )}
      </div>
    </div>
  );
};
