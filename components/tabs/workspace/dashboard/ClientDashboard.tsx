import React, { useState, useEffect } from 'react';
import { Client, ClientTask, ClientNote } from '@/types';
import { db } from '@/services/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { TaskItem } from '../tasks/TaskItem';
import { TaskManagementModal } from './TaskManagementModal';
import { NoteViewerModal } from './NoteViewerModal';
import { Plus, StickyNote, CheckCircle2, Circle, ChevronDown, ChevronUp, Zap, Layers, Wallet, Archive, LayoutGrid, ClipboardCheck, Calendar, Clock, Briefcase } from 'lucide-react';
import { QuickChatFloating } from './QuickChatFloating';

interface ClientDashboardProps {
  client: Client;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ client }) => {
  // --- STATE ---
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [liveClient, setLiveClient] = useState<Client>(client);
  
  // Filter State
  const [taskFilter, setTaskFilter] = useState<'Active' | 'Done'>('Active');
  
  // Foundation State
  const [foundationData, setFoundationData] = useState<Record<string, boolean>>({});
  const [foundationProgress, setFoundationProgress] = useState(0);

  // UI State
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Onboarding': true,
    'Restoration': true,
    'Funding': true,
    'General': true
  });
  
  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<ClientNote | null>(null);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!client.id) return;
    
    // 0. Live Client Listener (for Header/Dates)
    const unsubClient = onSnapshot(doc(db, 'clients', client.id), (docSnap) => {
        if(docSnap.exists()) setLiveClient({ id: docSnap.id, ...docSnap.data() } as Client);
    });

    // 1. Tasks Listener
    const tasksQuery = query(collection(db, 'clients', client.id, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientTask)));
        setLoadingTasks(false);
    });

    // 2. Notes Listener
    const notesQuery = query(collection(db, 'clients', client.id, 'notes'), orderBy('createdAt', 'desc'));
    const unsubNotes = onSnapshot(notesQuery, (snapshot) => {
        setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientNote)));
    });

    // 3. Foundation Readiness Listener
    const readinessRef = doc(db, 'clients', client.id, 'foundation', 'readiness');
    const unsubReadiness = onSnapshot(readinessRef, (snap) => {
        const data = snap.exists() ? snap.data() : {};
        setFoundationData(data);
        
        // Calculate Progress
        const items = ['fico', 'tradelines', 'utilization', 'age', 'derogatories'];
        const completed = items.filter(i => data[i]).length;
        setFoundationProgress(Math.round((completed / items.length) * 100));
    });

    return () => {
        unsubClient();
        unsubTasks();
        unsubNotes();
        unsubReadiness();
    };
  }, [client.id]);

  // --- HANDLERS ---
  const handleUpdateClient = async (data: Partial<Client>) => {
      await updateDoc(doc(db, 'clients', client.id), data);
  };

  const setQuickDate = (field: 'consultingDueDate' | 'disputeDueDate', days: number) => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const dateStr = targetDate.toISOString().split('T')[0];
      handleUpdateClient({ [field]: dateStr });
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Complete' ? 'Todo' : 'Complete';
    await updateDoc(doc(db, 'clients', client.id, 'tasks', taskId), {
        status: newStatus
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
        await deleteDoc(doc(db, 'clients', client.id, 'tasks', taskId));
    } catch (e) {
        console.error("Error deleting task:", e);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleFoundationItem = async (key: string) => {
      await setDoc(doc(db, 'clients', client.id, 'foundation', 'readiness'), {
          [key]: !foundationData[key]
      }, { merge: true });
  };

  // --- GROUPING & SORTING ---
  const activeCount = tasks.filter(t => t.status !== 'Complete').length;
  const doneCount = tasks.filter(t => t.status === 'Complete').length;

  const filteredTasks = tasks.filter(t => {
      if (taskFilter === 'Active') return t.status !== 'Complete';
      if (taskFilter === 'Done') return t.status === 'Complete';
      return true;
  });

  const sortTasks = (taskList: ClientTask[]) => {
    return [...taskList].sort((a, b) => {
      if (a.priority === 'High' && b.priority !== 'High') return -1;
      if (a.priority !== 'High' && b.priority === 'High') return 1;
      return 0;
    });
  };

  const groupedTasks = filteredTasks.reduce((acc, task) => {
      const cat = task.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(task);
      return acc;
  }, {} as Record<string, ClientTask[]>);

  const categoryOrder = ['Onboarding', 'Restoration', 'Funding', 'General'];
  const sortedCategories = Object.keys(groupedTasks).sort((a, b) => {
      const idxA = categoryOrder.indexOf(a);
      const idxB = categoryOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
  });

  const getCategoryIcon = (cat: string) => {
      switch(cat) {
          case 'Onboarding': return <Archive size={16} />;
          case 'Restoration': return <Zap size={16} />;
          case 'Funding': return <Wallet size={16} />;
          case 'General': return <LayoutGrid size={16} />;
          default: return <Layers size={16} />;
      }
  };

  const FOUNDATION_CHECKLIST = [
      { id: 'fico', label: 'FICO Score 680+ (minimum) / 700 to 740+ (ideal)' },
      { id: 'tradelines', label: '5 Open Tradeline Accounts' },
      { id: 'utilization', label: 'Credit Utilization Under 20% (ideal under 10%)' },
      { id: 'age', label: 'Average Age of Accounts 2+ Years' },
      { id: 'derogatories', label: 'No Derogatories' }
  ];

  return (
    <div className="flex flex-col h-full gap-6 relative animate-fade-in">
      
      {/* MODALS */}
      <TaskManagementModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        client={client} 
      />
      <NoteViewerModal 
        note={selectedNote} 
        onClose={() => setSelectedNote(null)} 
      />

      {/* TOP ROW: Foundation + Case Management (Dates/Status) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-shrink-0">
          
          {/* 1. Foundation Checklist (1/3 Width) */}
          <div className="lg:col-span-1">
              <LiquidGlassCard className="h-44 !p-0 flex flex-col bg-white/60 relative overflow-hidden">
                 <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <ClipboardCheck size={14} className="text-[#007AFF]" /> Foundation
                    </h3>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shadow-sm border border-blue-100">{foundationProgress}% Ready</span>
                 </div>
                 <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {FOUNDATION_CHECKLIST.map(item => (
                        <div 
                            key={item.id} 
                            onClick={() => toggleFoundationItem(item.id)}
                            className="flex items-start gap-3 p-2 hover:bg-white/80 rounded-lg cursor-pointer group transition-colors"
                        >
                            <div className={`mt-0.5 transition-colors ${foundationData[item.id] ? 'text-emerald-500' : 'text-slate-300 group-hover:text-blue-400'}`}>
                                {foundationData[item.id] ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                            </div>
                            <span className={`text-[10px] font-bold leading-tight transition-all ${foundationData[item.id] ? 'text-slate-400/80 line-through' : 'text-slate-600'}`}>
                                {item.label}
                            </span>
                        </div>
                    ))}
                 </div>
                 <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100">
                    <div className="h-full bg-[#007AFF] transition-all duration-700 ease-out" style={{ width: `${foundationProgress}%` }} />
                 </div>
              </LiquidGlassCard>
          </div>

          {/* 2. Case Management (2/3 Width - Status & Dates) */}
          <div className="lg:col-span-2">
              <LiquidGlassCard className="h-44 !p-0 bg-white/60 flex flex-col">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                          <Briefcase size={14} className="text-purple-600" /> Case Management
                      </h3>
                  </div>
                  <div className="flex-1 p-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                      {/* Status Selector */}
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Current Status</label>
                          <select 
                              value={liveClient.status}
                              onChange={(e) => handleUpdateClient({ status: e.target.value as any })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-purple-500/20 outline-none cursor-pointer hover:border-purple-300 transition-colors"
                          >
                              <option value="Active">Active</option>
                              <option value="Lead">Lead</option>
                              <option value="Onboarding">Onboarding</option>
                              <option value="Dispute">Dispute</option>
                              <option value="Archived">Archived</option>
                          </select>
                      </div>

                      {/* Consulting Due Date */}
                      <div className="space-y-1.5">
                          <div className="flex justify-between items-center pr-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                                  <Calendar size={10} /> Consulting Due
                              </label>
                              <button 
                                onClick={() => setQuickDate('consultingDueDate', 7)}
                                className="text-[9px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors"
                                title="Set to 7 days from now"
                              >
                                +7 Days
                              </button>
                          </div>
                          <input 
                              type="date"
                              value={liveClient.consultingDueDate || ''}
                              onChange={(e) => handleUpdateClient({ consultingDueDate: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                      </div>

                      {/* Dispute Due Date */}
                      <div className="space-y-1.5">
                          <div className="flex justify-between items-center pr-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                                  <Clock size={10} /> Dispute Due
                              </label>
                              <button 
                                onClick={() => setQuickDate('disputeDueDate', 30)}
                                className="text-[9px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded transition-colors"
                                title="Set to 30 days from now"
                              >
                                +30 Days
                              </button>
                          </div>
                          <input 
                              type="date"
                              value={liveClient.disputeDueDate || ''}
                              onChange={(e) => handleUpdateClient({ disputeDueDate: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-red-500/20 outline-none"
                          />
                      </div>
                  </div>
              </LiquidGlassCard>
          </div>
      </div>

      {/* BOTTOM ROW: Command Center (2/3) + Notes (1/3) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Command Center (Left - 2/3 Width) */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-4 px-2">
                  <div className="flex items-center gap-4">
                      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Command Center</h2>
                      <button 
                        onClick={() => setIsTaskModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-bold shadow-md hover:bg-slate-800 transition-all active:scale-95"
                      >
                        <Plus size={12} strokeWidth={3} /> Quick Task
                      </button>
                  </div>
                  <div className="flex bg-slate-200/50 p-1 rounded-full border border-white/40">
                      <button 
                        onClick={() => setTaskFilter('Active')}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${taskFilter === 'Active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                          {activeCount} Active
                      </button>
                      <button 
                        onClick={() => setTaskFilter('Done')}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${taskFilter === 'Done' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                          {doneCount} Done
                      </button>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10 space-y-6">
                  {loadingTasks ? (
                      <div className="text-center py-10 text-slate-400 font-bold">Loading tasks...</div>
                  ) : (
                      <div className="space-y-4">
                          {sortedCategories.map(category => {
                              const catTasks = sortTasks(groupedTasks[category] || []);
                              const isExpanded = expandedCategories[category] !== false;
                              if (catTasks.length === 0) return null;

                              return (
                                  <div key={category} className="space-y-2">
                                      <button 
                                          onClick={() => toggleCategory(category)}
                                          className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/50 transition-all group"
                                      >
                                          <div className="flex items-center gap-3">
                                              <div className={`p-1.5 rounded-lg text-slate-500 group-hover:text-slate-700 bg-slate-100 group-hover:bg-white transition-colors`}>
                                                  {getCategoryIcon(category)}
                                              </div>
                                              <h3 className="font-bold text-slate-600 group-hover:text-slate-900 text-xs uppercase tracking-wider">{category}</h3>
                                              <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                                  {catTasks.length}
                                              </span>
                                          </div>
                                          <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
                                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                          </div>
                                      </button>

                                      {isExpanded && (
                                          <div className="space-y-2 pl-2 animate-fade-in">
                                              {catTasks.map(task => (
                                                  <TaskItem 
                                                      key={task.id} 
                                                      task={task} 
                                                      onToggle={handleToggleTask} 
                                                      onDelete={handleDeleteTask}
                                                  />
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                          
                          {filteredTasks.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-12 opacity-50">
                                  <CheckCircle2 size={32} className="text-slate-300 mb-2" />
                                  <p className="text-sm font-bold text-slate-400">No {taskFilter.toLowerCase()} tasks found.</p>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>

          {/* Notes (Right - 1/3 Width - Moved Down) */}
          <div className="lg:col-span-1 flex flex-col min-h-0">
              <div className="mb-4 px-2">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Recent Notes</h2>
              </div>
              <LiquidGlassCard className="flex-1 !p-0 overflow-hidden flex flex-col bg-white/40 min-h-[300px]">
                  <div className="px-5 py-3 border-b border-white/40 bg-white/30 backdrop-blur-sm flex justify-between items-center">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                          <StickyNote size={14} /> History
                      </h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                      {notes.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center text-xs text-slate-400 font-medium italic p-4">
                              No notes recorded yet.
                          </div>
                      ) : (
                          notes.map(note => (
                              <button 
                                key={note.id}
                                onClick={() => setSelectedNote(note)}
                                className="w-full bg-white/60 rounded-xl p-3 text-left border border-white/40 hover:scale-[1.01] transition-transform shadow-sm group"
                              >
                                  <div className="flex justify-between items-start mb-1">
                                      <h4 className="font-bold text-slate-800 text-[11px] truncate pr-2 group-hover:text-blue-600">{note.title || 'Untitled Note'}</h4>
                                      <span className="text-[9px] text-slate-400 whitespace-nowrap">{note.createdAt?.seconds ? new Date(note.createdAt.seconds * 1000).toLocaleDateString() : ''}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                                      {note.content}
                                  </p>
                              </button>
                          ))
                      )}
                  </div>
              </LiquidGlassCard>
          </div>
      </div>

    </div>
  );
};