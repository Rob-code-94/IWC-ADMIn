import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { GlobalDashboardView } from '@/components/tabs/GlobalDashboard/GlobalDashboardView';
import { GlobalClientsView } from '@/components/tabs/GlobalClients/GlobalClientsView';
import { GlobalMessagesView } from '@/components/tabs/GlobalMessages/GlobalMessagesView';
import { GlobalResourcesView } from '@/components/tabs/GlobalResources/GlobalResourcesView';
import { GlobalTasksView } from '@/components/tabs/GlobalTasks/GlobalTasksView';
import { GlobalSettingsView } from '@/components/tabs/GlobalSettings/GlobalSettingsView';
import { ClientWorkspace } from '@/components/tabs/workspace/ClientWorkspace';
import { Page, Client } from '@/types';
import { useClients } from '@/context/ClientContext';
import { useSidebar } from '@/context/SidebarContext';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { NotificationBanner } from '@/components/ui/NotificationBanner';
import { useAdminAlerts } from '@/hooks/useAdminAlerts';

const AppShell: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('global-dashboard');
  const [workspaceClient, setWorkspaceClient] = useState<Client | null>(null);
  const { clients } = useClients();
  const { setDeepWork, setCollapsed } = useSidebar();
  
  // Real-time Admin Alerts
  const { activeAlert, dismissAlert, counts, unreadClientIds } = useAdminAlerts();

  // Sync Deep Work mode with Workspace presence
  useEffect(() => {
    setDeepWork(!!workspaceClient);
    if (workspaceClient) {
      setCollapsed(true); // Enforce close on workspace entry
    }
  }, [workspaceClient, setDeepWork, setCollapsed]);

  const handleOpenWorkspace = (client: Client) => {
    setWorkspaceClient(client);
    setCollapsed(true); // Double down on closure
  };

  return (
    <div className="min-h-screen w-full bg-[#F2F2F7] flex overflow-hidden font-sans text-slate-900">
      {/* Top Notification System */}
      <NotificationBanner alert={activeAlert} onDismiss={dismissAlert} />

      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        badgeCounts={counts}
      />
      
      <main className="flex-1 h-screen overflow-y-auto custom-scrollbar relative">
        {/* iOS 18 Style Ambient Background Blobs (Subtle Light) */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-200/40 blur-[120px] mix-blend-multiply"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-200/40 blur-[100px] mix-blend-multiply"></div>
        </div>

        <div className="relative z-10 h-full">
            {workspaceClient ? (
              <ClientWorkspace client={workspaceClient} onBack={() => setWorkspaceClient(null)} />
            ) : (
              <div className="p-6 md:p-8 h-full">
                {activePage === 'global-dashboard' && <GlobalDashboardView onOpenWorkspace={handleOpenWorkspace} />}
                
                {activePage === 'global-clients' && <GlobalClientsView onOpenWorkspace={handleOpenWorkspace} />}

                {activePage === 'global-messages' && <GlobalMessagesView unreadClientIds={unreadClientIds} />}

                {activePage === 'global-resources' && <GlobalResourcesView />}

                {activePage === 'global-tasks' && <GlobalTasksView />}

                {activePage === 'global-settings' && <GlobalSettingsView />}
                
                {activePage !== 'global-dashboard' && 
                 activePage !== 'global-clients' && 
                 activePage !== 'global-messages' && 
                 activePage !== 'global-resources' && 
                 activePage !== 'global-tasks' &&
                 activePage !== 'global-settings' && (
                     <div className="flex flex-col items-center justify-center h-[70vh]">
                        <LiquidGlassCard className="text-center max-w-md backdrop-blur-3xl">
                            <h2 className="text-3xl font-bold mb-2 text-slate-900">Restricted Area</h2>
                            <p className="text-slate-500 mb-8 font-medium">The {activePage.replace('global-', '')} module is currently being built.</p>
                            <button 
                                onClick={() => setActivePage('global-dashboard')}
                                className="px-8 py-3 bg-[#007AFF] hover:bg-blue-600 text-white rounded-full font-semibold transition-all shadow-lg shadow-blue-500/30 active:scale-95"
                            >
                                Return to Dashboard
                            </button>
                        </LiquidGlassCard>
                     </div>
                )}
              </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default AppShell;