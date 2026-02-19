import React, { useState, useEffect } from 'react';
import { Client } from '@/types';
import { PortfolioTab } from './PortfolioTab';
import { BankingTab } from './BankingTab';
import { ActiveOpsTab } from './ActiveOpsTab';
import { subscribeToReadiness } from '@/services/firebase';

type FundingSubTab = 'portfolio' | 'banking' | 'active-ops';

export const FundingModule: React.FC<{ client: Client }> = ({ client }) => {
  const [activeSubTab, setActiveSubTab] = useState<FundingSubTab>('active-ops');
  const [progress, setProgress] = useState(0);

  const READINESS_ITEMS = [
    { id: 'fraud_alerts', label: 'Fraud Alerts Removed' },
    { id: 'income_verified', label: 'Income Verified' },
    { id: 'address_standardized', label: 'Address Standardized' },
    { id: 'freeze_thawed', label: 'Freeze Thawed' }
  ];

  useEffect(() => {
    if (!client.id) return;
    return subscribeToReadiness(client.id, (data) => {
      if (!data) {
        setProgress(0);
        return;
      }
      const checkedCount = READINESS_ITEMS.filter(item => data[item.id] === true).length;
      const percentage = Math.round((checkedCount / READINESS_ITEMS.length) * 100);
      setProgress(percentage);
    });
  }, [client.id]);

  const renderContent = () => {
    switch (activeSubTab) {
        case 'portfolio': return <PortfolioTab client={client} />;
        case 'banking': return <BankingTab client={client} />;
        case 'active-ops': return <ActiveOpsTab client={client} />;
        default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
        {/* iOS 18 HEADER TOOLBAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-4">
            
            {/* Sub-Navigation (Segmented Control Style) */}
            <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-full w-fit border border-white/40">
                {[
                    { id: 'portfolio', label: 'Portfolio' },
                    { id: 'banking', label: 'Banking' },
                    { id: 'active-ops', label: 'Active Ops' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id as FundingSubTab)}
                        className={`px-6 py-2 rounded-full text-xs font-bold transition-all duration-300
                            ${activeSubTab === tab.id 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'}
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Readiness Tracker Widget (Dynamic Progress) */}
            <div className="flex items-center gap-4 bg-white/40 border border-white/60 rounded-2xl p-2 px-4 shadow-sm">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Pre-Funding Readiness</span>
                    <span className="text-xs font-black text-slate-900">{progress}% Complete</span>
                </div>
                <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#007AFF] rounded-full shadow-[0_0_8px_rgba(0,122,255,0.5)] transition-all duration-700 ease-out" 
                      style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
        </div>

        {/* DYNAMIC CONTENT STAGE */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            {renderContent()}
        </div>
    </div>
  );
};