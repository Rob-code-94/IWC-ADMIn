import React from 'react';
import AppShell from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClientProvider } from '@/context/ClientContext';
import { SidebarProvider } from '@/context/SidebarContext';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ClientProvider>
        <SidebarProvider>
          <AppShell />
        </SidebarProvider>
      </ClientProvider>
    </ErrorBoundary>
  );
};

export default App;