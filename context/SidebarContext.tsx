import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggleCollapse: () => void;
  isDeepWork: boolean;
  setDeepWork: (v: boolean) => void;
  interactionStart: () => void;
  interactionEnd: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // RESTING POSITION: Always collapsed
  const [isCollapsed, setIsCollapsed] = useState(true); 
  const [isDeepWork, setIsDeepWork] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAutoCloseTimer = useCallback(() => {
    clearTimer();
    // Aggressive 3-second close timer whenever expanded
    timerRef.current = setTimeout(() => {
      setIsCollapsed(true);
    }, 3000); 
  }, [clearTimer]);

  // Monitor collapsed state to trigger timer when opened
  useEffect(() => {
    if (!isCollapsed) {
      startAutoCloseTimer();
    } else {
      clearTimer();
    }
  }, [isCollapsed, startAutoCloseTimer, clearTimer]);

  const interactionStart = () => {
    // Keep timer running or reset it to ensure it closes even if being looked at
    startAutoCloseTimer();
  };

  const interactionEnd = () => {
    if (!isCollapsed) startAutoCloseTimer();
  };

  const toggleCollapse = () => {
    const nextValue = !isCollapsed;
    setIsCollapsed(nextValue);
  };

  return (
    <SidebarContext.Provider value={{ 
      isCollapsed, 
      setCollapsed: setIsCollapsed, 
      toggleCollapse, 
      isDeepWork, 
      setDeepWork: setIsDeepWork,
      interactionStart,
      interactionEnd
    }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};