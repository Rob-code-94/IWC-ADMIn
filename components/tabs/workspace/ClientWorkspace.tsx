import React, { useState } from 'react';
import { Client, WorkspaceTab } from '@/types';
import { WorkspaceHeader } from './WorkspaceHeader';
import { RestorationModule } from './restoration/RestorationModule';
import { FundingModule } from './funding/FundingModule';
import { ClientDashboard } from './dashboard/ClientDashboard';
import { VaultView } from './vault/VaultView';
import { LayoutDashboard, Zap, Wallet, ShieldCheck, LayoutGrid } from 'lucide-react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { QuickChatFloating } from './dashboard/QuickChatFloating';

interface ClientWorkspaceProps {
  client: Client;
  onBack: () => void;
}

export const ClientWorkspace: React.FC<ClientWorkspaceProps> = ({ client, onBack }) => {
  // AUTO-LOAD: Default to 'dashboard' for immediate operational overview
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');

  const NAV_ITEMS: { id: WorkspaceTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={22} strokeWidth={2} /> },
    { id: 'restoration', label: 'Restoration', icon: <Zap size={22} strokeWidth={2} /> },
    { id: 'funding', label: 'Funding', icon: <Wallet size={22} strokeWidth={2} /> },
    { id: 'vault', label: 'Vault', icon: <ShieldCheck size={22} strokeWidth={2} /> },
  ];

  return (
    <div className="p-2 md:p-4 h-full flex flex-col max-w-[1800px] mx-auto overflow-hidden relative">
      {/* Pinned Workspace Header */}
      <WorkspaceHeader client={client} onBack={onBack} />

      <div className="flex-1 flex gap-4 md:gap-6 min-h-0 animate-fade-in-up">
        {/* VERTICAL CONTROL STRIP (Left Gutter) 
            - Narrower (w-[72px])
            - Centered Vertically (self-center, h-fit)
            - Not full height
        */}
        <div className="w-[72px] h-fit self-center flex flex-col items-center py-4 gap-4 bg-white/60 backdrop-blur-2xl border border-white/40 rounded-[2rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] flex-shrink-0 z-20">
            {NAV_ITEMS.map(item => {
                const isActive = activeTab === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`
                            relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group
                            ${isActive 
                                ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/30 scale-105' 
                                : 'text-slate-400 hover:bg-white hover:text-blue-500'}
                        `}
                        title={item.label}
                    >
                        {item.icon}
                        {isActive && (
                            <div className="absolute left-[-2px] top-1/2 -translate-y-1/2 w-1 h-6 bg-white/20 rounded-r-full"></div>
                        )}
                        
                        {/* Hover Tooltip Label */}
                        <span className="absolute left-full ml-4 px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </div>

        {/* FLUID CONTENT STAGE 
            - Added py-1 to prevent top clipping
            - overflow-hidden ensures child scrolls work
        */}
        <div className="flex-1 flex flex-col min-w-0 h-full py-1">
             <div className="flex-1 h-full overflow-hidden rounded-[2.5rem] relative">
                {activeTab === 'restoration' ? (
                    <RestorationModule client={client} />
                ) : activeTab === 'funding' ? (
                    <FundingModule client={client} />
                ) : activeTab === 'dashboard' ? (
                    <ClientDashboard client={client} />
                ) : activeTab === 'vault' ? (
                    <VaultView client={client} />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <LiquidGlassCard className="text-center p-12 bg-white/40">
                            <LayoutGrid size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-xl font-bold text-slate-900">Module Loading</h3>
                        </LiquidGlassCard>
                    </div>
                )}
             </div>
        </div>
      </div>

      {/* FLOATING ACTION HUB - Quick Chat (Left) */}
      <QuickChatFloating client={client} />
    </div>
  );
};