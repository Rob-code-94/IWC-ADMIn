import React, { useState, useEffect } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { useClients } from '@/context/ClientContext';
import { Client } from '@/types';
import { ICONS } from '@/constants';
import { db } from '@/services/firebase';
import { collectionGroup, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { 
  Pin, CheckCircle2, AlertTriangle, TrendingUp, 
  DollarSign, Clock, ArrowRight, ShieldAlert,
  Wallet, Layers
} from 'lucide-react';

interface GlobalDashboardViewProps {
  onOpenWorkspace: (client: Client) => void;
}

interface DashboardTask {
  id: string;
  title: string;
  clientName?: string;
  dueDate?: any;
  priority: string;
}

export const GlobalDashboardView: React.FC<GlobalDashboardViewProps> = ({ onOpenWorkspace }) => {
  const { clients, loading } = useClients();
  const [urgentTasks, setUrgentTasks] = useState<DashboardTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Filter Pinned Clients
  const pinnedClients = clients.filter(c => c.isPinned);

  // Mock Progress Data (In a real app, this would come from the client document or an aggregation index)
  // We use the client list to populate these cards for the visual requirement.
  const foundationClients = clients.filter(c => c.status === 'Onboarding').slice(0, 4).map(c => ({
      ...c,
      progress: Math.floor(Math.random() * (90 - 50 + 1) + 50) // Random 50-90%
  }));

  const fundingClients = clients.filter(c => c.status === 'Active').slice(0, 4).map(c => ({
      ...c,
      progress: Math.floor(Math.random() * (85 - 50 + 1) + 50) // Random 50-85%
  }));

  // Fetch Urgent Disputes (Global)
  useEffect(() => {
    const fetchUrgent = async () => {
        try {
            // Fetch high priority tasks globally
            const q = query(
                collectionGroup(db, 'tasks'),
                where('priority', '==', 'High'),
                where('status', '!=', 'Complete'),
                limit(10)
            );
            const snapshot = await getDocs(q);
            const tasks: DashboardTask[] = [];
            
            // Note: getting client name requires parent doc lookup or denormalized data.
            // For dashboard speed, we'll assume tasks might have clientName or we fetch generic.
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                tasks.push({
                    id: doc.id,
                    title: data.title,
                    priority: data.priority,
                    dueDate: data.dueDate,
                    // Mock client name for UI if not present in task
                    clientName: 'Client Action' 
                });
            });
            setUrgentTasks(tasks);
        } catch (e) {
            console.error("Dashboard Task Fetch Error:", e);
        } finally {
            setLoadingTasks(false);
        }
    };
    fetchUrgent();
  }, []);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12 font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Command Center</h1>
            <p className="text-slate-500 font-medium mt-1">Operational overview and priority monitoring.</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm rounded-full p-1 pl-5 flex items-center transition-all hover:bg-white/80 w-full md:w-auto">
            <span className="text-sm font-semibold text-slate-500 mr-3 hidden md:inline">Global Search</span>
            <div className="w-9 h-9 rounded-full bg-[#007AFF] flex items-center justify-center text-white shadow-md shadow-blue-500/20 ml-auto md:ml-0">
                {ICONS['search']}
            </div>
        </div>
      </header>

      {/* 1. VIP / PINNED CLIENTS STRIP */}
      {pinnedClients.length > 0 && (
          <section>
              <div className="flex items-center gap-2 mb-4 px-2">
                  <Pin size={16} className="text-[#007AFF] fill-[#007AFF]" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Pinned Clients</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {pinnedClients.map(client => (
                      <button 
                        key={client.id}
                        onClick={() => onOpenWorkspace(client)}
                        className="bg-white/70 hover:bg-white backdrop-blur-md border border-white/60 p-4 rounded-[1.5rem] text-left transition-all shadow-sm hover:shadow-md hover:-translate-y-1 group relative overflow-hidden"
                      >
                          <div className="absolute top-0 left-0 w-1 h-full bg-[#007AFF] opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-sm group-hover:bg-[#007AFF] group-hover:text-white transition-colors">
                                  {client.firstName[0]}{client.lastName[0]}
                              </div>
                              <div className="min-w-0">
                                  <p className="font-bold text-slate-900 text-sm truncate">{client.firstName} {client.lastName}</p>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{client.status}</p>
                              </div>
                          </div>
                      </button>
                  ))}
              </div>
          </section>
      )}

      {/* 2. HERO METRICS (Retained & Refined) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
            { label: 'Active Disputes', val: '142', sub: '+12% this week', icon: ICONS['message-square'], color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Pending Funding', val: '$45k', sub: '3 active apps', icon: ICONS['dollar-sign'], color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Tasks Due', val: urgentTasks.length.toString(), sub: 'High Priority', icon: ICONS['check-square'], color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'New Leads', val: '24', sub: 'Needs Review', icon: ICONS['users'], color: 'text-purple-600', bg: 'bg-purple-50' }
        ].map((stat, i) => (
            <LiquidGlassCard key={i} className="flex flex-col justify-between h-32 group hover:scale-[1.02] transition-transform">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        <h4 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">{stat.val}</h4>
                    </div>
                    <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                        <div className="scale-75">{stat.icon}</div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className={stat.color} />
                    <span className={`text-xs font-bold ${stat.color}`}>{stat.sub}</span>
                </div>
            </LiquidGlassCard>
        ))}
      </div>

      {/* 3. OPERATIONAL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMN 1: DISPUTE WAR ROOM */}
          <div className="lg:col-span-1 space-y-6">
              <LiquidGlassCard className="h-full flex flex-col !p-0 bg-red-50/30 border-red-100">
                  <div className="p-6 pb-2 border-b border-red-100 bg-red-50/50">
                      <div className="flex items-center gap-2 mb-1">
                          <ShieldAlert className="text-red-500" size={20} />
                          <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Dispute War Room</h3>
                      </div>
                      <p className="text-xs text-red-600/70 font-bold">Action required within 48 hours</p>
                  </div>
                  
                  <div className="flex-1 p-4 space-y-3">
                      {loadingTasks ? (
                          <div className="text-center py-8 text-slate-400 font-bold">Scanning priorities...</div>
                      ) : urgentTasks.length === 0 ? (
                          <div className="text-center py-12 opacity-50">
                              <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-2" />
                              <p className="text-sm font-bold text-slate-600">All Clear</p>
                          </div>
                      ) : (
                          urgentTasks.slice(0, 5).map(task => (
                              <div key={task.id} className="bg-white p-3 rounded-2xl shadow-sm border border-red-100 flex items-start gap-3 hover:scale-[1.02] transition-transform cursor-pointer">
                                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0 animate-pulse" />
                                  <div>
                                      <h4 className="text-sm font-bold text-slate-900 leading-tight">{task.title}</h4>
                                      <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                                              {task.clientName || 'General'}
                                          </span>
                                          <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                                              <Clock size={10} /> Due Soon
                                          </span>
                                      </div>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
                  <button className="m-4 py-3 bg-red-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors">
                      Process Urgent Items
                  </button>
              </LiquidGlassCard>
          </div>

          {/* COLUMN 2: MOMENTUM TRACKERS */}
          <div className="lg:col-span-1 space-y-6">
              
              {/* Foundation Tracker */}
              <LiquidGlassCard className="!p-0 bg-blue-50/30 border-blue-100">
                  <div className="p-5 border-b border-blue-100 bg-blue-50/50 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          <Layers className="text-blue-600" size={18} />
                          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Foundation &gt; 50%</h3>
                      </div>
                      <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {foundationClients.length} Clients
                      </span>
                  </div>
                  <div className="p-2 space-y-1">
                      {foundationClients.map(client => (
                          <div key={client.id} onClick={() => onOpenWorkspace(client)} className="flex items-center justify-between p-3 hover:bg-white rounded-xl cursor-pointer transition-colors group">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                      {client.firstName[0]}
                                  </div>
                                  <div>
                                      <p className="text-xs font-bold text-slate-700">{client.firstName} {client.lastName}</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase">Onboarding</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <span className="text-xs font-black text-blue-600">{client.progress}%</span>
                                  <div className="w-16 h-1 bg-blue-100 rounded-full mt-1 overflow-hidden">
                                      <div className="h-full bg-blue-500" style={{ width: `${client.progress}%` }} />
                                  </div>
                              </div>
                          </div>
                      ))}
                      {foundationClients.length === 0 && <div className="p-4 text-center text-xs text-slate-400 font-medium">No clients currently in range.</div>}
                  </div>
              </LiquidGlassCard>

              {/* Funding Readiness */}
              <LiquidGlassCard className="!p-0 bg-emerald-50/30 border-emerald-100">
                  <div className="p-5 border-b border-emerald-100 bg-emerald-50/50 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          <Wallet className="text-emerald-600" size={18} />
                          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Funding Ready</h3>
                      </div>
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          {fundingClients.length} Candidates
                      </span>
                  </div>
                  <div className="p-2 space-y-1">
                      {fundingClients.map(client => (
                          <div key={client.id} onClick={() => onOpenWorkspace(client)} className="flex items-center justify-between p-3 hover:bg-white rounded-xl cursor-pointer transition-colors group">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                      {client.firstName[0]}
                                  </div>
                                  <div>
                                      <p className="text-xs font-bold text-slate-700">{client.firstName} {client.lastName}</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase">Pre-Funding</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <span className="text-xs font-black text-emerald-600">{client.progress}%</span>
                                  <div className="w-16 h-1 bg-emerald-100 rounded-full mt-1 overflow-hidden">
                                      <div className="h-full bg-emerald-500" style={{ width: `${client.progress}%` }} />
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </LiquidGlassCard>

          </div>

          {/* COLUMN 3: REVENUE & ALERTS */}
          <div className="lg:col-span-1 space-y-6">
              {/* Revenue Recovery */}
              <LiquidGlassCard className="bg-slate-900 text-white !p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                      <DollarSign size={120} />
                  </div>
                  <div className="relative z-10">
                      <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 mb-4">
                          <AlertTriangle className="text-yellow-400" size={18} /> Revenue Recovery
                      </h3>
                      <div className="space-y-3 mb-6">
                          <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl border border-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                              <div>
                                  <p className="text-xs font-bold">Invoice #1024</p>
                                  <p className="text-[10px] text-slate-400 uppercase">Brian Burt • 14 days over</p>
                              </div>
                              <span className="text-sm font-black text-yellow-400">$1,200</span>
                          </div>
                          <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl border border-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                              <div>
                                  <p className="text-xs font-bold">Invoice #1099</p>
                                  <p className="text-[10px] text-slate-400 uppercase">Preston R. • 3 days over</p>
                              </div>
                              <span className="text-sm font-black text-yellow-400">$450</span>
                          </div>
                      </div>
                      <button className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                          View All Invoices <ArrowRight size={14} />
                      </button>
                  </div>
              </LiquidGlassCard>

              {/* System Note */}
              <div className="bg-white/40 border border-white/60 rounded-[2rem] p-6 text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">System Status</p>
                  <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-black">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      ALL SYSTEMS OPERATIONAL
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};