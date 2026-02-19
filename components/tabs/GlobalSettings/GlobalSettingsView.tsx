import React, { useState, useRef, useEffect } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { Database, Play, Terminal, ShieldCheck, Settings, Loader2, AlertTriangle, Lock, Unlock } from 'lucide-react';
import { migrateFundingToActiveOps } from '@/services/fundingMigration';

export const GlobalSettingsView: React.FC = () => {
  const [logs, setLogs] = useState<string[]>(["System ready... Waiting for instruction."]);
  const [isRunning, setIsRunning] = useState(false);
  const [isArmed, setIsArmed] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
    console.log(`[MigrationLog] ${msg}`); // Also log to devtools
  };

  const handleRunMigration = async () => {
    if (!isArmed) {
        addLog("PERMISSION DENIED: System is not armed. Please toggle the Safety Switch.");
        return;
    }
    
    setIsRunning(true);
    addLog("PROTOCOL INITIATED: Relocating funding data to Active Ops hierarchy...");
    
    try {
      await migrateFundingToActiveOps(addLog);
    } catch (e: any) {
      addLog(`CRITICAL ERROR: ${e.message}`);
      console.error("Migration Failed:", e);
    } finally {
      setIsRunning(false);
      setIsArmed(false); // Safety first
    }
  };

  return (
    <div className="flex h-full gap-8 p-2 animate-fade-in font-sans max-w-[1400px] mx-auto overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-72 flex-shrink-0 space-y-2 pt-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-8 pl-4 flex items-center gap-3">
          <Settings className="text-[#007AFF]" /> Settings
        </h2>
        
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/50 text-slate-400 border border-transparent cursor-default transition-colors hover:bg-white/80">
          <ShieldCheck size={18} /> <span className="font-bold text-sm">Security & Access</span>
        </div>
        
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#007AFF] text-white shadow-lg shadow-blue-500/30 cursor-pointer group">
          <Database size={18} className="group-hover:rotate-12 transition-transform" /> 
          <span className="font-bold text-sm">Data Migration</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2 pt-2 pb-20">
        <LiquidGlassCard className="p-10 space-y-8 bg-white/60">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Database Pivot Console</h3>
              <p className="text-slate-500 font-medium max-w-xl leading-relaxed">
                Relocate legacy <code className="bg-slate-100 px-1 rounded text-[#007AFF]">funding</code> nodes into the functional 3-tier hierarchy.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
                {/* SAFETY TOGGLE */}
                <button 
                  onClick={() => setIsArmed(!isArmed)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all
                    ${isArmed ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'}
                  `}
                >
                    {isArmed ? <Unlock size={14} /> : <Lock size={14} />}
                    {isArmed ? "System Armed" : "Safety Armed"}
                </button>

                <button 
                  onClick={handleRunMigration}
                  disabled={isRunning || !isArmed}
                  className={`px-10 py-4 rounded-full font-black text-sm uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl active:scale-95 ${
                    isRunning 
                      ? 'bg-slate-100 text-slate-400 cursor-wait' 
                      : !isArmed 
                        ? 'bg-slate-300 text-white cursor-not-allowed opacity-50'
                        : 'bg-[#007AFF] text-white hover:bg-blue-600 shadow-blue-500/30 hover:scale-105'
                  }`}
                >
                  {isRunning ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
                  {isRunning ? "Executing..." : "Start Migration"}
                </button>
            </div>
          </div>

          <div className="bg-blue-50/50 rounded-[2rem] p-6 border border-blue-100 flex items-start gap-4">
             <AlertTriangle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
             <div className="text-xs text-blue-800 leading-relaxed font-medium">
                <span className="font-black uppercase tracking-wider block mb-1 underline">Warning: Permanent Operation</span>
                This script executes a move-and-delete protocol. Data will be relocated to <strong>banking_relationships</strong> and <strong>active_ops</strong> collections. Do not close this window while the "Executing..." state is active.
             </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 px-2">
                <Terminal size={14} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Execution_Log.sys</span>
            </div>
            <div className="bg-slate-950 rounded-[2.5rem] p-10 h-[450px] border border-slate-800 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#007AFF] to-transparent opacity-50" />
              
              <div 
                ref={consoleRef} 
                className="h-full overflow-y-auto font-mono text-[11px] text-[#00E5FF] space-y-2 custom-scrollbar pb-10 selection:bg-white/10"
              >
                {logs.map((log, i) => (
                  <div key={i} className={`animate-fade-in-up ${log.includes('ERROR') ? 'text-red-400' : ''}`}>
                    <span className="opacity-30 mr-4">[{i.toString().padStart(3, '0')}]</span>
                    {log}
                  </div>
                ))}
                {isRunning && (
                  <div className="flex items-center gap-3 mt-6 text-white">
                    <div className="w-2 h-2 rounded-full bg-[#007AFF] animate-ping" />
                    <span className="italic opacity-60 text-xs">Kernel processing active... scan in progress.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </LiquidGlassCard>
      </div>
    </div>
  );
};