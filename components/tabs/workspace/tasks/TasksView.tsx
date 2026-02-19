import React, { useState, useEffect } from 'react';
import { Client, ClientTask } from '@/types';
import { db } from '@/services/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, writeBatch, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { TaskItem } from './TaskItem';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { Plus, Layers, Zap, CheckCircle2, ListTodo, Loader2, Search } from 'lucide-react';

interface TasksViewProps {
  client: Client;
}

interface BundleTemplate {
    id: string;
    title: string;
    category: string;
    isPinned: boolean;
    template_ids: string[];
    createdAt?: any;
}

interface TaskTemplate {
    id: string;
    title: string;
    category: string;
    priority: string;
}

export const TasksView: React.FC<TasksViewProps> = ({ client }) => {
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [bundles, setBundles] = useState<BundleTemplate[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBundles, setLoadingBundles] = useState(true);
  const [deployingId, setDeployingId] = useState<string | null>(null);
  
  // Quick Task State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('General');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');

  // Template Lookup State
  const [taskCreationMode, setTaskCreationMode] = useState<'custom' | 'template'>('custom');
  const [templateSearch, setTemplateSearch] = useState('');

  // 1. Fetch Client Tasks
  useEffect(() => {
    if (!client.id) return;
    setLoading(true);
    // Real-time listener
    const q = query(collection(db, 'clients', client.id, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientTask));
        setTasks(data);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [client.id]);

  // 2. Fetch Bundle Templates
  useEffect(() => {
    const q = query(collection(db, 'bundle_templates'), orderBy('title', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BundleTemplate));
        // Optional: Sort pinned first
        const sorted = data.sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));
        setBundles(sorted);
        setLoadingBundles(false);
    });
    return () => unsubscribe();
  }, []);

  // 3. Fetch Single Task Templates
  useEffect(() => {
    const q = query(collection(db, 'task_templates'), orderBy('title', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setTaskTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskTemplate)));
    });
    return () => unsubscribe();
  }, []);

  // Logic: Incomplete first, then by priority/date
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === 'Complete' && b.status !== 'Complete') return 1;
    if (a.status !== 'Complete' && b.status === 'Complete') return -1;
    // If status same, prioritize High
    if (a.priority === 'High' && b.priority !== 'High') return -1;
    if (a.priority !== 'High' && b.priority === 'High') return 1;
    return 0;
  });

  const filteredTemplates = taskTemplates.filter(t => 
      t.title.toLowerCase().includes(templateSearch.toLowerCase()) || 
      t.category.toLowerCase().includes(templateSearch.toLowerCase())
  );

  const handleToggle = async (taskId: string, currentStatus: string) => {
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

  // Add the Update Handler
  const handleUpdateTask = async (taskId: string, data: Partial<ClientTask>) => {
      try {
          await updateDoc(doc(db, 'clients', client.id, 'tasks', taskId), data);
      } catch (e) {
          console.error("Error updating task:", e);
      }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    await addDoc(collection(db, 'clients', client.id, 'tasks'), {
        title: newTaskTitle,
        category: newTaskCategory,
        priority: newTaskPriority,
        status: 'Todo',
        createdAt: serverTimestamp(),
        dueDate: serverTimestamp() // Default to today
    });
    setNewTaskTitle('');
  };

  const handleAddTemplateTask = async (template: TaskTemplate) => {
      try {
        await addDoc(collection(db, 'clients', client.id, 'tasks'), {
            title: template.title || 'Untitled Task',
            category: template.category || 'General',
            priority: template.priority || 'Medium',
            status: 'Todo',
            createdAt: serverTimestamp(),
            dueDate: serverTimestamp()
        });
        // Optional: Flash success or just clear search
        setTemplateSearch('');
      } catch (e) {
          console.error("Error adding template task:", e);
      }
  };

  const handleDeployBundle = async (bundle: BundleTemplate) => {
    if (!bundle.template_ids || bundle.template_ids.length === 0) {
        alert("This bundle has no tasks.");
        return;
    }
    
    if (!confirm(`Deploy "${bundle.title}" bundle? This will add ${bundle.template_ids.length} tasks.`)) return;

    setDeployingId(bundle.id);
    try {
        const batch = writeBatch(db);
        
        // Fetch all task templates in parallel
        const templatePromises = bundle.template_ids.map(id => getDoc(doc(db, 'task_templates', id)));
        const templateSnapshots = await Promise.all(templatePromises);
        
        let addedCount = 0;
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
                addedCount++;
            }
        });

        if (addedCount > 0) {
            await batch.commit();
        } else {
            alert("No valid task templates found for this bundle.");
        }
    } catch (e) {
        console.error("Error deploying bundle:", e);
        alert("Failed to deploy bundle. Check console.");
    } finally {
        setDeployingId(null);
    }
  };

  return (
    <div className="flex h-full gap-8 animate-fade-in">
        
        {/* LEFT COLUMN: Active Tasks Feed */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10 space-y-6">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-slate-900">Active Tasks</h2>
                <div className="flex gap-2 text-xs font-bold text-slate-500">
                    <span className="px-3 py-1 bg-white rounded-full shadow-sm">
                        {tasks.filter(t => t.status !== 'Complete').length} Pending
                    </span>
                    <span className="px-3 py-1 bg-white/50 rounded-full">
                        {tasks.filter(t => t.status === 'Complete').length} Done
                    </span>
                </div>
            </div>

            {loading ? (
                <div className="p-8 text-center text-slate-400 font-bold">Loading tasks...</div>
            ) : sortedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center opacity-60">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                        <CheckCircle2 size={32} />
                    </div>
                    <p className="font-bold text-slate-600">All caught up!</p>
                    <p className="text-xs text-slate-500">No active tasks found.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedTasks.map(task => (
                        <TaskItem 
                            key={task.id} 
                            task={task} 
                            onToggle={handleToggle}
                            onDelete={handleDeleteTask}
                            onUpdate={handleUpdateTask} // Pass the update handler
                        />
                    ))}
                </div>
            )}
        </div>

        {/* RIGHT COLUMN: Sidebar (384px Fixed) */}
        <div className="w-[384px] flex-shrink-0 flex flex-col gap-6">
            
            {/* Quick Task Module */}
            <LiquidGlassCard className="bg-white/80 border-blue-100 relative overflow-hidden flex flex-col max-h-[500px]">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <Plus size={14} className="text-blue-500" /> Add Task
                    </h3>
                    <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                        <button 
                            onClick={() => setTaskCreationMode('custom')}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${taskCreationMode === 'custom' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Custom
                        </button>
                        <button 
                            onClick={() => setTaskCreationMode('template')}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${taskCreationMode === 'template' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Library
                        </button>
                    </div>
                </div>

                {taskCreationMode === 'custom' ? (
                    <div className="space-y-4 animate-fade-in">
                        <input 
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Task title..."
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                        />
                        <div className="flex gap-2">
                             <select 
                                value={newTaskCategory}
                                onChange={(e) => setNewTaskCategory(e.target.value)}
                                className="flex-1 bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none"
                             >
                                 <option>General</option>
                                 <option>Restoration</option>
                                 <option>Funding</option>
                                 <option>Onboarding</option>
                             </select>
                             <select 
                                value={newTaskPriority}
                                onChange={(e) => setNewTaskPriority(e.target.value)}
                                className="w-24 bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none"
                             >
                                 <option>High</option>
                                 <option>Medium</option>
                                 <option>Low</option>
                             </select>
                        </div>
                        <button 
                            onClick={handleAddTask}
                            disabled={!newTaskTitle.trim()}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95"
                        >
                            Add Task
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3 animate-fade-in flex flex-col flex-1 min-h-0">
                        <div className="relative flex-shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                                value={templateSearch}
                                onChange={(e) => setTemplateSearch(e.target.value)}
                                placeholder="Search templates..."
                                className="w-full bg-slate-50 border-none rounded-xl pl-9 pr-3 py-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/10 outline-none"
                                autoFocus
                            />
                        </div>
                        <div className="overflow-y-auto custom-scrollbar space-y-2 pr-1 flex-1 min-h-[150px]">
                            {filteredTemplates.length === 0 ? (
                                <div className="text-center py-8 text-[10px] text-slate-400 font-medium italic">
                                    {templateSearch ? 'No matching SOPs found.' : 'Search to find templates.'}
                                </div>
                            ) : (
                                filteredTemplates.map(t => (
                                    <button 
                                        key={t.id}
                                        onClick={() => handleAddTemplateTask(t)}
                                        className="w-full text-left p-3 rounded-xl bg-white border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all group relative overflow-hidden"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-slate-900 text-xs truncate pr-2 group-hover:text-blue-600 transition-colors">{t.title}</h4>
                                            <Plus size={14} className="text-slate-300 group-hover:text-blue-500 flex-shrink-0" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] text-slate-500 font-medium bg-slate-50 px-1.5 py-0.5 rounded uppercase">{t.category}</span>
                                            <span className={`text-[9px] font-bold uppercase ${t.priority === 'High' ? 'text-red-500' : 'text-slate-400'}`}>{t.priority}</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </LiquidGlassCard>

            {/* SOP & Bundle Deployer */}
            <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                    <ListTodo size={14} /> Workflow Bundles
                </h3>
                
                <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1">
                    {loadingBundles ? (
                         <div className="text-center py-8 text-slate-400 font-medium">Loading templates...</div>
                    ) : bundles.length === 0 ? (
                         <div className="text-center py-8 text-slate-400 font-medium border-2 border-dashed border-slate-200 rounded-xl">
                             No bundles found.
                         </div>
                    ) : (
                        bundles.map(bundle => (
                            <LiquidGlassCard 
                                key={bundle.id} 
                                className={`group hover:bg-white transition-colors cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500 relative
                                    ${deployingId === bundle.id ? 'opacity-70 pointer-events-none' : ''}
                                `} 
                                onClick={() => handleDeployBundle(bundle)}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                                        {bundle.title.includes('Readiness') ? <Layers size={18} /> : <Zap size={18} />}
                                    </div>
                                    <h4 className="font-bold text-slate-900 text-sm">{bundle.title}</h4>
                                </div>
                                <div className="pl-11">
                                    <p className="text-[10px] text-slate-500 font-medium mb-3">
                                        Category: {bundle.category || 'General'}
                                    </p>
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                        {deployingId === bundle.id ? (
                                            <span className="text-blue-600 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Deploying...</span>
                                        ) : (
                                            <><CheckCircle2 size={12} /> Includes {bundle.template_ids?.length || 0} tasks</>
                                        )}
                                    </div>
                                </div>
                                {bundle.isPinned && (
                                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500"></div>
                                )}
                            </LiquidGlassCard>
                        ))
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};