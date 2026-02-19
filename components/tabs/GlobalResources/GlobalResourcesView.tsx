import React, { useState } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { Landmark, Scale, GraduationCap, ServerCog, BookOpen, Search, ArrowRight, FileText, Database } from 'lucide-react';
import { LenderDataPoints } from './funding/LenderDataPoints';
import { BureauMatrix } from './funding/BureauMatrix';
import { LawLibraryView } from './restoration/LawLibraryView';

type ResourceViewMode = 'hub' | 'lender-data' | 'bureau-matrix' | 'law-library';

export const GlobalResourcesView: React.FC = () => {
  const [viewMode, setViewMode] = useState<ResourceViewMode>('hub');

  // SUB-VIEW RENDERERS
  if (viewMode === 'lender-data') {
      return <LenderDataPoints onBack={() => setViewMode('hub')} />;
  }

  if (viewMode === 'bureau-matrix') {
      return <BureauMatrix onBack={() => setViewMode('hub')} />;
  }

  if (viewMode === 'law-library') {
      return <LawLibraryView onBack={() => setViewMode('hub')} />;
  }

  // MAIN HUB RENDERER
  return (
    <div className="space-y-8 animate-fade-in max-w-[1600px] mx-auto pb-12">
      <header className="flex justify-between items-end">
          <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Resources Hub</h1>
              <p className="text-slate-500 font-medium mt-1">Central Intelligence & Operations Center.</p>
          </div>
          <div className="hidden md:flex items-center gap-3 bg-white/60 backdrop-blur-md rounded-full px-4 py-2 border border-white/50 shadow-sm">
             <Search size={16} className="text-slate-400" />
             <input placeholder="Search entire knowledge base..." className="bg-transparent border-none outline-none text-sm font-medium w-64 text-slate-700 placeholder:text-slate-400" />
          </div>
      </header>

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 auto-rows-[minmax(200px,auto)]">
          
          {/* 1. Funding Intelligence (Large Featured) */}
          <LiquidGlassCard className="lg:col-span-8 row-span-2 relative overflow-hidden !p-0 group bg-gradient-to-br from-blue-600 to-indigo-700 border-none">
             <div className="absolute top-0 right-0 p-12 opacity-10 text-white group-hover:scale-110 transition-transform duration-700">
                 <Landmark size={240} />
             </div>
             
             <div className="relative z-10 h-full flex flex-col p-8 text-white">
                 <div className="flex items-center gap-3 mb-6">
                     <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl">
                         <Database size={24} className="text-blue-200" />
                     </div>
                     <h2 className="text-2xl font-bold tracking-tight">Funding Intelligence</h2>
                 </div>
                 
                 <p className="text-blue-100 text-lg max-w-xl mb-8 leading-relaxed">
                     The definitive database of bank underwriting rules. Access approval tiers, bureau pull requirements, and sensitive LTV ratios for high-limit funding.
                 </p>

                 <div className="mt-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <button 
                        onClick={() => setViewMode('lender-data')}
                        className="flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all border border-white/10 text-left group/btn"
                     >
                         <div>
                             <span className="block font-bold text-sm">Lender Data Points</span>
                             <span className="text-[10px] text-blue-200 uppercase tracking-wider">Updated 2h ago</span>
                         </div>
                         <ArrowRight className="opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" size={18} />
                     </button>
                     <button 
                        onClick={() => setViewMode('bureau-matrix')}
                        className="flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all border border-white/10 text-left group/btn"
                     >
                         <div>
                             <span className="block font-bold text-sm">Bureau Matrix</span>
                             <span className="text-[10px] text-blue-200 uppercase tracking-wider">Interactive Map</span>
                         </div>
                         <ArrowRight className="opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" size={18} />
                     </button>
                 </div>
             </div>
          </LiquidGlassCard>

          {/* 2. Restoration Vault */}
          <LiquidGlassCard className="lg:col-span-4 lg:row-span-2 flex flex-col !p-0 bg-white/60">
             <div className="p-8 pb-4 flex-1">
                 <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 bg-slate-900 text-white rounded-lg">
                         <Scale size={20} />
                     </div>
                     <h2 className="text-xl font-bold text-slate-900">Restoration Vault</h2>
                 </div>
                 <p className="text-sm text-slate-500 mb-6 font-medium">
                     Law library covering FCRA, FDCPA, and FACTA violations. Includes master dispute templates.
                 </p>
                 <div className="space-y-3">
                     {['Factual Dispute Master Class', 'Metro2 Compliance Guide', 'CFPB Escalation Scripts'].map((item, i) => (
                         <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white transition-colors cursor-pointer group">
                             <FileText size={16} className="text-slate-400 group-hover:text-blue-500" />
                             <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">{item}</span>
                         </div>
                     ))}
                 </div>
             </div>
             <div className="p-4 bg-slate-50 border-t border-slate-200/50">
                 <button 
                    onClick={() => setViewMode('law-library')}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors"
                 >
                     Open Law Library
                 </button>
             </div>
          </LiquidGlassCard>

          {/* 3. Consulting Hub */}
          <LiquidGlassCard className="lg:col-span-4 bg-gradient-to-br from-emerald-50 to-white flex flex-col justify-between group cursor-pointer hover:shadow-md transition-all">
             <div>
                 <div className="flex items-center gap-3 mb-3">
                     <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                         <GraduationCap size={20} />
                     </div>
                     <h2 className="text-lg font-bold text-slate-900">Consulting Hub</h2>
                 </div>
                 <p className="text-xs text-slate-500 font-medium">Sales scripts & onboarding frameworks.</p>
             </div>
             <div className="mt-4 flex gap-2">
                 <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold">Scripts</span>
                 <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold">Frameworks</span>
             </div>
          </LiquidGlassCard>

          {/* 4. Business Ops */}
          <LiquidGlassCard className="lg:col-span-4 bg-gradient-to-br from-purple-50 to-white flex flex-col justify-between group cursor-pointer hover:shadow-md transition-all">
             <div>
                 <div className="flex items-center gap-3 mb-3">
                     <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                         <ServerCog size={20} />
                     </div>
                     <h2 className="text-lg font-bold text-slate-900">Business Ops</h2>
                 </div>
                 <p className="text-xs text-slate-500 font-medium">Internal systems, billing & voice protocols.</p>
             </div>
             <div className="mt-4 flex gap-2">
                 <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-[10px] font-bold">SOPs</span>
                 <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-[10px] font-bold">Admin</span>
             </div>
          </LiquidGlassCard>

          {/* 5. Resource Library */}
          <LiquidGlassCard className="lg:col-span-4 bg-gradient-to-br from-orange-50 to-white flex flex-col justify-between group cursor-pointer hover:shadow-md transition-all">
             <div>
                 <div className="flex items-center gap-3 mb-3">
                     <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                         <BookOpen size={20} />
                     </div>
                     <h2 className="text-lg font-bold text-slate-900">Resource Library</h2>
                 </div>
                 <p className="text-xs text-slate-500 font-medium">Client education & downloadable PDFs.</p>
             </div>
             <div className="mt-4 flex gap-2">
                 <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-[10px] font-bold">PDFs</span>
                 <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-[10px] font-bold">News</span>
             </div>
          </LiquidGlassCard>
      </div>
    </div>
  );
};