import React, { useState } from 'react';
import { Client } from '@/types';
import { ReportTab } from './ReportTab';
import { LetterHubTab } from './LetterHubTab';
import { AllLettersTab } from './AllLettersTab';
import { ComplaintHelpTab } from './ComplaintHelpTab';

type RestorationSubTab = 'report' | 'letter-hub' | 'all-letters' | 'complaint-help';

export const RestorationModule: React.FC<{ client: Client }> = ({ client }) => {
  const [activeSubTab, setActiveSubTab] = useState<RestorationSubTab>('report');

  const renderContent = () => {
    switch (activeSubTab) {
      case 'report': return <ReportTab client={client} />;
      case 'letter-hub': return <LetterHubTab client={client} />;
      case 'all-letters': return <AllLettersTab client={client} />;
      case 'complaint-help': return <ComplaintHelpTab client={client} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Module Sub-Navigation */}
      <div className="flex items-center gap-6 border-b border-slate-200/60 px-4 flex-shrink-0 overflow-x-auto custom-scrollbar min-h-[40px]">
        {[
            { id: 'report', label: 'Report' },
            { id: 'letter-hub', label: 'Letter Hub' },
            { id: 'all-letters', label: 'All Letters' },
            { id: 'complaint-help', label: 'Complaint Help' },
        ].map((tab) => (
            <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as RestorationSubTab)}
                className={`pb-3 text-xs font-black uppercase tracking-widest transition-all relative whitespace-nowrap
                    ${activeSubTab === tab.id 
                        ? 'text-[#007AFF]' 
                        : 'text-slate-400 hover:text-slate-600'}
                `}
            >
                {tab.label}
                {activeSubTab === tab.id && (
                    <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#007AFF] rounded-t-full shadow-sm shadow-blue-500/50"></span>
                )}
            </button>
        ))}
      </div>

      {/* Dynamic Content Area */}
      <div className="flex-1 min-h-0">
          {renderContent()}
      </div>
    </div>
  );
};