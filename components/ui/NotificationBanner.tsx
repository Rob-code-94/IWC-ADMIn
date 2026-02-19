import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info';
}

interface NotificationBannerProps {
  alert: Alert | null;
  onDismiss: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ alert, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (alert) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Allow animation to finish
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alert, onDismiss]);

  if (!alert && !isVisible) return null;

  return (
    <div 
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
            ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-24 opacity-0'}
        `}
    >
      <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xl border border-white/50 pl-4 pr-6 py-3 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12)] min-w-[360px] max-w-lg">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm
            ${alert?.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 
              alert?.type === 'warning' ? 'bg-orange-100 text-orange-600' : 
              'bg-blue-100 text-blue-600'}
        `}>
            {alert?.type === 'success' ? <CheckCircle2 size={20} /> : 
             alert?.type === 'warning' ? <AlertCircle size={20} /> : 
             <Bell size={20} />}
        </div>
        
        <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-900 truncate">{alert?.title}</h4>
            <p className="text-xs font-medium text-slate-500 truncate">{alert?.message}</p>
        </div>

        <button 
            onClick={() => setIsVisible(false)}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
        >
            <X size={16} />
        </button>
      </div>
    </div>
  );
};