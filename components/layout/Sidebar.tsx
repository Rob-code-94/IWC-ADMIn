import React from 'react';
import { GLOBAL_NAV, ICONS } from '@/constants';
import { Page } from '@/types';
import { useSidebar } from '@/context/SidebarContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  badgeCounts?: {
    messages: number;
    tasks: number;
  };
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, badgeCounts }) => {
  const { isCollapsed, toggleCollapse, setCollapsed, interactionStart, interactionEnd } = useSidebar();

  const handleNavClick = (id: Page) => {
    setActivePage(id);
    setCollapsed(true); // Close immediately on selection
  };

  const getBadge = (id: Page) => {
    if (id === 'global-messages' && badgeCounts?.messages) return badgeCounts.messages;
    if (id === 'global-tasks' && badgeCounts?.tasks) return badgeCounts.tasks;
    return 0;
  };

  return (
    <aside 
      onMouseEnter={interactionStart}
      onMouseLeave={interactionEnd}
      className={`
        h-screen bg-white/95 backdrop-blur-3xl border-r border-white/40 flex flex-col pt-8 pb-4 
        transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]
        ${isCollapsed ? 'w-[88px]' : 'w-[260px]'}
      `}
    >
      {/* Header / Logo */}
      <div className={`px-6 mb-10 flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
        <div className="w-10 h-10 rounded-2xl bg-[#007AFF] flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0 transition-transform hover:scale-105 cursor-default">
            <span className="font-bold text-white text-xl tracking-tight">I</span>
        </div>
        <div className={`ml-3 overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          <span className="font-bold text-xl tracking-tight text-slate-900">
            IWC <span className="text-slate-400">Admin</span>
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-2">
        {GLOBAL_NAV.map((item) => {
            const isActive = activePage === item.id;
            const badge = getBadge(item.id);

            return (
                <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`
                        w-full flex items-center p-3.5 rounded-[1.2rem] transition-all duration-300 group relative
                        ${isActive 
                            ? 'bg-[#007AFF] shadow-lg shadow-blue-500/25 text-white scale-[1.02]' 
                            : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'}
                        ${isCollapsed ? 'justify-center' : 'justify-start'}
                    `}
                >
                    <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>
                        {ICONS[item.icon]}
                    </span>
                    
                    <span className={`ml-4 font-semibold text-[15px] whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block'}`}>
                        {item.label}
                    </span>

                    {/* Notification Badge */}
                    {badge > 0 && (
                        <div className={`absolute ${isCollapsed ? 'top-2 right-2' : 'right-3 top-1/2 -translate-y-1/2'} 
                            bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] rounded-full flex items-center justify-center shadow-sm border border-white
                        `}>
                            {badge > 99 ? '99+' : badge}
                        </div>
                    )}
                </button>
            );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="px-3 mt-auto space-y-4">
         {/* Manual Toggle Button */}
         <button 
           onClick={toggleCollapse}
           className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-[#007AFF] hover:bg-blue-50 rounded-xl transition-all"
         >
           {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
         </button>

         {/* Profile Card */}
         <div className={`bg-white/50 backdrop-blur-md border border-white/60 rounded-[1.5rem] p-2 flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} cursor-pointer hover:bg-white/80 transition-all shadow-sm group`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                AD
            </div>
            <div className={`ml-3 overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                <p className="text-xs font-bold text-slate-800">Admin User</p>
                <p className="text-[10px] text-slate-500 font-medium">Super Admin</p>
            </div>
         </div>
      </div>
    </aside>
  );
};

export default Sidebar;