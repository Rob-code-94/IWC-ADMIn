import React, { useState, useEffect } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { X, Plus, Zap, Layers, ListTodo, CheckCircle2, Loader2, Search, ArrowRight, Link as LinkIcon } from 'lucide-react';
import { Client } from '@/types';
import { db } from '@/services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, writeBatch, doc, serverTimestamp, getDoc } from 'firebase/firestore';

interface TaskManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
}

interface BundleTemplate {
  id: string;
  title: string;
  category: string;
  description?: string;
  template_ids: string[];
}

interface TaskTemplate {
  id: string;
  title: string;
  category: string;
  priority: string;
}

export const TaskManagementModal: React.FC<TaskManagementModalProps> = ({ isOpen, onClose, client }) => {
  const [activeTab, setActiveTab] = useState<'single' | 'bundle'>('single');
  const [singleMode, setSingleMode] = useState<'custom' | 'library'>('custom');
  
  // Custom Task State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('General');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskLink, setTaskLink] = useState('');
  
  // Data State
  const [bundles, setBundles] = useState<BundleTemplate[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [loadingBundles, setLoadingBundles] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');

  // Sync with Global Bundle Templates
  useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, 'bundle_templates'), orderBy('title', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setBundles(snap.docs.map(d => ({ id: d.id, ...d.data() } as BundleTemplate)));
      setLoadingBundles(false);
    });
    return () => unsub();
  }, [isOpen]);

  // Sync with Global Task Templates
  useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, 'task_templates'), orderBy('title', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setTaskTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskTemplate)));
      setLoadingTemplates(false);
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddTask = async () => {
    if (!taskTitle.trim()) return;
    setIsSubmitting(true);
    try {
        await addDoc(collection(db, 'clients', client.id, 'tasks'), {
            title: taskTitle,
            category: taskCategory,
            priority: taskPriority,
            websiteLink: taskLink || '',
            status: 'Todo',
            createdAt: serverTimestamp(),
            dueDate: serverTimestamp()
        });
        setTaskTitle('');
        setTaskLink('');
        onClose();
    } catch (e) {
        console.error("Error adding task", e);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeployTemplate = async (template: TaskTemplate) => {
      setIsSubmitting(true);
      setDeployingId(template.id);
      try {
          await addDoc(collection(db, 'clients', client.id, 'tasks'), {
              title: template.title || 'Untitled Task',
              category: template.category || 'General',
              priority: template.priority || 'Medium',
              status: 'Todo',
              createdAt: serverTimestamp(),
              dueDate: serverTimestamp()
          });
          onClose();
      } catch (e) {
          console.error("Error deploying template task", e);
      } finally {
          setIsSubmitting(false);
          setDeployingId(null);
      }
  };

  const handleDeployBundle = async (bundle: BundleTemplate) => {
    if (!bundle.template_ids || bundle.template_ids.length === 0) {
      alert("This bundle has no tasks.");
      return;
    }
    
    setDeployingId(bundle.id);
    setIsSubmitting(true);
    try {
        const batch = writeBatch(db);
        
        // Fetch all task templates in parallel
        const templatePromises = bundle.template_ids.map(id => getDoc(doc(db, 'task_templates', id)));
        const templateSnapshots = await Promise.all(templatePromises);
        
        templateSnapshots.forEach(snap => {
            if (snap.exists()) {
                const templateData = snap.data();
                const ref = doc(collection(db, 'clients', client.id, 'tasks'));
                batch.set(ref, {
                    title: templateData.title || 'Untitled Task',
                    category: templateData.category || bundle.category || 'General',
                    priority: templateData.priority || 'Medium',
                    status: 'Todo',
                    createdAt: serverTimestamp(),
                    dueDate: serverTimestamp()
                });
            }
        });

        await batch.commit();
        onClose();
    } catch (e) {
        console.error("Error deploying bundle", e);
    } finally {
        setIsSubmitting(false);
        setDeployingId(null);
    }
  };

  const filteredTaskTemplates = taskTemplates.filter(t => 
      t.title.toLowerCase().includes(templateSearch.toLowerCase()) || 
      t.category.toLowerCase().includes(templateSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Modal Content */}
      <LiquidGlassCard className="w-full max-w-[480px] relative z-10 !p-0 overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[85vh]">
         <div className="p-6 border-b border-white/40 bg-white/50 backdrop-blur-md flex justify-between items-center flex-shrink-0">
             <div className="flex items-center gap-3">
                 <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg">
                     <ListTodo size={22} strokeWidth={2.5} />
                 </div>
                 <h3 className="font-bold text-slate-900 text-xl tracking-tight">Task Manager</h3>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                 <X size={20} />
             </button>
         </div>

         {/* iOS Style Segmented Tabs */}
         <div className="px-6 mt-6 flex-shrink-0">
             <div className="p-1.5 bg-slate-200/50 rounded-2xl flex gap-1 border border-white/40">
                 <button 
                    onClick={() => setActiveTab('single')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                     New Single Task
                 </button>
                 <button 
                    onClick={() => setActiveTab('bundle')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'bundle' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                     Deploy Bundle
                 </button>
             </div>
         </div>

         <div className="p-6 pt-4 bg-slate-50/30 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
             {activeTab === 'single' ? (
                 <div className="space-y-4 py-2">
                     
                     {/* Sub-Switch for Custom vs Library */}
                     <div className="flex justify-center mb-4">
                         <div className="flex gap-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                             <button 
                                onClick={() => setSingleMode('custom')}
                                className={`pb-1 border-b-2 transition-all ${singleMode === 'custom' ? 'text-slate-900 border-slate-900' : 'border-transparent hover:text-slate-600'}`}
                             >
                                 Custom Entry
                             </button>
                             <button 
                                onClick={() => setSingleMode('library')}
                                className={`pb-1 border-b-2 transition-all ${singleMode === 'library' ? 'text-slate-900 border-slate-900' : 'border-transparent hover:text-slate-600'}`}
                             >
                                 From Library
                             </button>
                         </div>
                     </div>

                     {singleMode === 'custom' ? (
                         <div className="space-y-4 animate-fade-in">
                             <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">Task Title</label>
                                <input 
                                    autoFocus
                                    value={taskTitle}
                                    onChange={(e) => setTaskTitle(e.target.value)}
                                    placeholder="e.g. Call Client for Update"
                                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all focus:border-blue-400"
                                />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-1">
                                     <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">Category</label>
                                     <select 
                                        value={taskCategory}
                                        onChange={(e) => setTaskCategory(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                                     >
                                         <option>General</option>
                                         <option>Restoration</option>
                                         <option>Funding</option>
                                         <option>Onboarding</option>
                                     </select>
                                 </div>
                                 <div className="space-y-1">
                                     <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">Priority</label>
                                     <select 
                                        value={taskPriority}
                                        onChange={(e) => setTaskPriority(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                                     >
                                         <option>High</option>
                                         <option>Medium</option>
                                         <option>Low</option>
                                     </select>
                                 </div>
                             </div>
                             <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">Website Link (Optional)</label>
                                <div className="relative">
                                    <LinkIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        value={taskLink}
                                        onChange={(e) => setTaskLink(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm font-medium text-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                    />
                                </div>
                             </div>
                             <button 
                                onClick={handleAddTask}
                                disabled={!taskTitle.trim() || isSubmitting}
                                className="w-full py-4 bg-[#007AFF] text-white rounded-2xl font-bold shadow-xl shadow-blue-500/30 hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                             >
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><Plus size={20} strokeWidth={3} /> Create Task</>}
                             </button>
                         </div>
                     ) : (
                         <div className="space-y-3 animate-fade-in h-full flex flex-col">
                             <div className="relative">
                                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                 <input 
                                     autoFocus
                                     value={templateSearch}
                                     onChange={(e) => setTemplateSearch(e.target.value)}
                                     placeholder="Search templates..."
                                     className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                 />
                             </div>
                             <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 min-h-[200px] pr-1">
                                 {filteredTaskTemplates.length === 0 ? (
                                     <div className="text-center py-8 text-slate-400 text-xs font-bold italic">
                                         {loadingTemplates ? "Loading templates..." : "No matching templates found."}
                                     </div>
                                 ) : (
                                     filteredTaskTemplates.map(t => (
                                         <button 
                                            key={t.id}
                                            onClick={() => handleDeployTemplate(t)}
                                            disabled={isSubmitting}
                                            className="w-full flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group text-left"
                                         >
                                             <div>
                                                 <h4 className="font-bold text-slate-900 text-xs">{t.title}</h4>
                                                 <div className="flex items-center gap-2 mt-1">
                                                     <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 px-1.5 py-0.5 rounded">{t.category}</span>
                                                     <span className={`text-[9px] font-bold uppercase ${t.priority === 'High' ? 'text-red-500' : 'text-slate-400'}`}>{t.priority}</span>
                                                 </div>
                                             </div>
                                             <div className={`p-2 rounded-full ${deployingId === t.id ? 'text-blue-600' : 'text-slate-300 group-hover:text-blue-500 group-hover:bg-blue-50'}`}>
                                                 {deployingId === t.id ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                             </div>
                                         </button>
                                     ))
                                 )}
                             </div>
                         </div>
                     )}
                 </div>
             ) : (
                 <div className="space-y-3 h-full overflow-y-auto custom-scrollbar pr-1 py-2">
                     {loadingBundles ? (
                       <div className="text-center py-12 text-slate-400 font-bold animate-pulse">Loading Bundles...</div>
                     ) : bundles.length === 0 ? (
                       <div className="text-center py-12 text-slate-400 font-bold italic">No bundles available.</div>
                     ) : (
                       bundles.map(bundle => (
                         <button 
                            key={bundle.id}
                            onClick={() => handleDeployBundle(bundle)}
                            disabled={isSubmitting}
                            className={`w-full text-left p-5 bg-white border border-slate-100 rounded-[2rem] hover:border-blue-300 hover:shadow-lg transition-all duration-300 group relative overflow-hidden flex flex-col gap-3
                              ${deployingId === bundle.id ? 'opacity-60 ring-2 ring-blue-500/20' : ''}
                            `}
                         >
                             <div className="flex items-center gap-4">
                                 <div className={`p-2.5 rounded-2xl transition-colors duration-300 
                                    ${bundle.title.toLowerCase().includes('onboarding') ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}
                                    group-hover:bg-blue-600 group-hover:text-white shadow-sm
                                 `}>
                                     {bundle.title.toLowerCase().includes('onboarding') ? <Zap size={22} fill="currentColor" /> : <Layers size={22} fill="currentColor" />}
                                 </div>
                                 <div className="flex-1">
                                     <h4 className="font-bold text-slate-900 text-[15px]">{bundle.title}</h4>
                                     <p className="text-xs text-slate-500 font-medium leading-relaxed">{bundle.category || 'Standard SOP'}</p>
                                 </div>
                                 {deployingId === bundle.id && (
                                   <Loader2 className="animate-spin text-blue-600" size={20} />
                                 )}
                             </div>
                             <div className="pt-2 flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                 <CheckCircle2 size={14} className="text-blue-500/50" /> Includes {bundle.template_ids?.length || 0} tasks
                             </div>
                         </button>
                       ))
                     )}
                 </div>
             )}
         </div>
      </LiquidGlassCard>
    </div>
  );
};