import React, { useState, useEffect } from 'react';
import { db } from '@/services/firebase';
import { collection, query, orderBy, onSnapshot, where, doc, deleteDoc, addDoc, serverTimestamp, writeBatch, getDoc } from 'firebase/firestore';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { 
  Plus, Search, Zap, Layers, Activity, Play, Edit3, Trash2, 
  ChevronRight, CheckCircle2, Loader2, Users, Target, ChevronDown, Check
} from 'lucide-react';
import { useClients } from '@/context/ClientContext';
import { TemplateEditorModal } from './TemplateEditorModal';
import { BundleModal } from './BundleModal';

interface TaskTemplate {
  id: string;
  title: string;
  category: string;
  priority: string;
  description?: string;
  websiteLink?: string;
}

interface BundleTemplate {
  id: string;
  title: string;
  category: string;
  template_ids: string[];
}

interface LiveTask {
  id: string;
  title: string;
  clientName: string;
  status: string;
  updatedAt: any;
}

export const GlobalTasksView: React.FC = () => {
  const { clients } = useClients();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [bundles, setBundles] = useState<BundleTemplate[]>([]);
  const [liveQueue, setLiveQueue] = useState<LiveTask[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Deployment State
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [isDeploying, setIsDeploying] = useState<string | null>(null);

  // Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [editingBundle, setEditingBundle] = useState<BundleTemplate | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch Task Templates
  useEffect(() => {
    const q = query(collection(db, 'task_templates'), orderBy('title', 'asc'));
    return onSnapshot(q, (snap) => {
      setTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskTemplate)));
      setLoading(false);
    });
  }, []);

  // 2. Fetch Bundle Templates
  useEffect(() => {
    const q = query(collection(db, 'bundle_templates'), orderBy('title', 'asc'));
    return onSnapshot(q, (snap) => {
      setBundles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BundleTemplate)));
    });
  }, []);

  // 3. Fetch Live System Queue (Global In-Progress Tasks)
  useEffect(() => {
    // Optimization: Filter server-side, sort client-side to avoid composite index error
    const q = query(collection(db, 'tasks'), where('status', '==', 'In Progress'));
    
    return onSnapshot(q, (snap) => {
      const tasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiveTask));
      // Client-side sort by updatedAt desc
      tasks.sort((a, b) => {
          const tA = a.updatedAt?.seconds || 0;
          const tB = b.updatedAt?.seconds || 0;
          return tB - tA;
      });
      setLiveQueue(tasks);
    }, (err) => {
      console.warn("Global tasks collection not accessible or missing index. Sidebar may be empty.", err);
    });
  }, []);

  const handleDeploySingle = async (template: TaskTemplate) => {
    if (selectedClientIds.length === 0) return;
    setIsDeploying(template.id);
    try {
      const promises = selectedClientIds.map(clientId => 
        addDoc(collection(db, 'clients', clientId, 'tasks'), {
          title: template.title || 'Untitled Task',
          category: template.category || 'General',
          priority: template.priority || 'Medium',
          websiteLink: template.websiteLink || '',
          status: 'Todo',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          dueDate: serverTimestamp()
        })
      );
      await Promise.all(promises);
    } finally {
      setIsDeploying(null);
    }
  };

  const handleDeployBundle = async (bundle: BundleTemplate) => {
    if (selectedClientIds.length === 0) return;
    setIsDeploying(bundle.id);
    try {
      // 1. Fetch template data once
      const templateDocs = await Promise.all(
        bundle.template_ids.map(tid => getDoc(doc(db, 'task_templates', tid)))
      );
      const validTemplates = templateDocs.filter(d => d.exists()).map(d => d.data());

      if (validTemplates.length === 0) return;

      // 2. Deploy to each client using parallel batches (one batch per client to avoid 500 limit if many templates)
      await Promise.all(selectedClientIds.map(async (clientId) => {
        const batch = writeBatch(db);
        validTemplates.forEach(tData => {
          const ref = doc(collection(db, 'clients', clientId, 'tasks'));
          batch.set(ref, {
            title: tData.title || 'Untitled Task',
            category: tData.category || bundle.category || 'General',
            priority: tData.priority || 'Medium',
            websiteLink: tData.websiteLink || '',
            status: 'Todo',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            dueDate: serverTimestamp()
          });
        });
        await batch.commit();
      }));

    } finally {
      setIsDeploying(null);
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredClients = clients.filter(c => 
    (c.firstName + ' ' + c.lastName).toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full gap-6 animate-fade-in max-w-[1600px] mx-auto pb-8">
      
      {/* COMMAND HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-2">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Global Tasks</h1>
          <p className="text-slate-500 font-medium mt-1">SOP Repository & Automation Control.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Multi-Client Deploy Selector */}
          <div className="relative z-50">
            <LiquidGlassCard 
                onClick={() => setIsClientSelectorOpen(!isClientSelectorOpen)}
                className="!p-2 flex items-center gap-3 bg-white/60 !rounded-full shadow-sm border-blue-100 cursor-pointer min-w-[260px] hover:bg-white transition-colors"
            >
                <div className="flex items-center gap-2 pl-2">
                    <Target size={16} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Deploy To:</span>
                </div>
                <div className="flex-1 font-bold text-sm text-slate-700 truncate pr-2">
                    {selectedClientIds.length === 0 
                        ? 'Select Clients...' 
                        : selectedClientIds.length === 1 
                            ? clients.find(c => c.id === selectedClientIds[0])?.firstName + ' ' + clients.find(c => c.id === selectedClientIds[0])?.lastName
                            : `${selectedClientIds.length} Clients Selected`}
                </div>
                <ChevronDown size={14} className="text-slate-400 mr-2" />
            </LiquidGlassCard>

            {isClientSelectorOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsClientSelectorOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 w-[320px] bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-fade-in-up">
                        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    autoFocus
                                    placeholder="Search clients..."
                                    value={clientSearch}
                                    onChange={(e) => setClientSearch(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {filteredClients.map(client => {
                                const isSelected = selectedClientIds.includes(client.id);
                                return (
                                    <div 
                                        key={client.id}
                                        onClick={() => {
                                            setSelectedClientIds(prev => 
                                                prev.includes(client.id) ? prev.filter(id => id !== client.id) : [...prev, client.id]
                                            );
                                        }}
                                        className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'}`}>
                                            {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-bold truncate ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                                                {client.firstName} {client.lastName}
                                            </p>
                                            <p className="text-[10px] text-slate-400 truncate font-medium">{client.email}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredClients.length === 0 && (
                                <div className="p-4 text-center text-xs text-slate-400 font-medium">No clients found</div>
                            )}
                        </div>
                        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                            <button 
                                onClick={() => setSelectedClientIds([])} 
                                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-200/50 transition-colors"
                            >
                                Clear Selection
                            </button>
                            <button 
                                onClick={() => setIsClientSelectorOpen(false)} 
                                className="text-[10px] font-bold text-white bg-slate-900 px-4 py-1.5 rounded-full hover:bg-slate-800 transition-colors shadow-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </>
            )}
          </div>

          <button 
            onClick={() => { setEditingTemplate(null); setIsTemplateModalOpen(true); }}
            className="bg-slate-900 text-white px-6 py-3.5 rounded-full font-bold text-sm shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus size={18} /> New Template
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0 overflow-hidden px-2">
        
        {/* LEFT COLUMN: MASTER REPOSITORY (70%) */}
        <div className="flex-[7] flex flex-col gap-8 min-h-0">
          
          {/* BUNDLES SECTION */}
          <div className="flex-shrink-0">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                <Layers size={14} className="text-blue-500" /> Master Workflow Bundles
              </h3>
              <button 
                onClick={() => { setEditingBundle(null); setIsBundleModalOpen(true); }}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Create Bundle
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bundles.map(bundle => (
                <LiquidGlassCard key={bundle.id} className="group hover:bg-white transition-all border-l-4 border-l-blue-500 cursor-default">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                        <Zap size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{bundle.title}</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{bundle.category}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => { setEditingBundle(bundle); setIsBundleModalOpen(true); }}
                        className="p-2 text-slate-300 hover:text-blue-600 transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <CheckCircle2 size={12} /> {bundle.template_ids.length} Steps
                    </div>
                    <button 
                      disabled={selectedClientIds.length === 0 || isDeploying === bundle.id}
                      onClick={() => handleDeployBundle(bundle)}
                      className={`
                        px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                        ${selectedClientIds.length === 0 
                          ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                          : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95'}
                      `}
                    >
                      {isDeploying === bundle.id ? <><Loader2 size={12} className="animate-spin" /> Deploying...</> : 'Deploy Bundle'}
                    </button>
                  </div>
                </LiquidGlassCard>
              ))}
            </div>
          </div>

          {/* INDIVIDUAL TEMPLATES */}
          <div className="flex-1 flex flex-col min-h-0">
             <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                  <Play size={14} className="text-emerald-500" /> Operational Templates
                </h3>
                <div className="relative group">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search SOPs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white/60 border-none rounded-full py-1.5 pl-9 pr-4 text-xs font-bold text-slate-600 w-48 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                  />
                </div>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
               {filteredTemplates.map(template => (
                 <LiquidGlassCard key={template.id} className="!p-4 group hover:bg-white transition-all flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs
                        ${template.category === 'Restoration' ? 'bg-purple-100 text-purple-600' : 
                          template.category === 'Funding' ? 'bg-emerald-100 text-emerald-600' : 
                          'bg-slate-100 text-slate-500'}
                      `}>
                        {template.title[0]}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 text-sm">{template.title}</h5>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {template.category} • {template.priority}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setEditingTemplate(template); setIsTemplateModalOpen(true); }}
                        className="p-2 text-slate-300 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        disabled={selectedClientIds.length === 0 || isDeploying === template.id}
                        onClick={() => handleDeploySingle(template)}
                        className={`
                          px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                          ${selectedClientIds.length === 0 
                            ? 'bg-slate-50 text-slate-200 cursor-not-allowed' 
                            : 'bg-slate-900 text-white shadow-sm hover:scale-105 active:scale-95'}
                        `}
                      >
                        {isDeploying === template.id ? <Loader2 size={12} className="animate-spin" /> : 'Deploy'}
                      </button>
                    </div>
                 </LiquidGlassCard>
               ))}
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE SYSTEM QUEUE (30%) */}
        <div className="flex-[3] flex flex-col gap-6 min-h-0">
          <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 flex flex-col h-full shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Activity size={200} />
            </div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Live Operations</h3>
                </div>
                <Users size={18} className="text-slate-500" />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 space-y-4">
                {liveQueue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-30">
                    <Activity size={40} className="mb-4" />
                    <p className="text-sm font-bold">Waiting for Activity...</p>
                  </div>
                ) : (
                  liveQueue.map(task => (
                    <div key={task.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-bold truncate pr-4">{task.title}</h4>
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-emerald-500 text-white rounded-full">Active</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-[8px] font-bold">
                          {task.clientName?.[0] || 'C'}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400">{task.clientName || 'Private Client'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">System Pulse</span>
                <span className="text-[10px] font-black text-emerald-500 tracking-wider">HEALTHY / 100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TemplateEditorModal 
        isOpen={isTemplateModalOpen} 
        onClose={() => setIsTemplateModalOpen(false)} 
        template={editingTemplate} 
      />
      <BundleModal 
        isOpen={isBundleModalOpen} 
        onClose={() => setIsBundleModalOpen(false)} 
        bundle={editingBundle}
        availableTemplates={templates}
      />
    </div>
  );
};