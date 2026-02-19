import React, { useState } from 'react';
import { ClientTask } from '@/types';
import { Calendar, AlertCircle, Trash2, Edit2, ExternalLink, Save, X, Globe, Link as LinkIcon } from 'lucide-react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';

interface TaskItemProps {
  task: ClientTask;
  onToggle: (id: string, currentStatus: string) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, data: Partial<ClientTask>) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete, onUpdate }) => {
  const isComplete = task.status === 'Complete';
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit States
  const [editTitle, setEditTitle] = useState(task.title);
  const [editCategory, setEditCategory] = useState(task.category);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editLink, setEditLink] = useState(task.websiteLink || '');

  // Helper to format URL
  const formatUrl = (url: string) => {
      if (!url) return '';
      return url.startsWith('http') ? url : `https://${url}`;
  };

  return (
    <LiquidGlassCard className={`relative group transition-all duration-300 !p-3 ${isComplete ? 'opacity-50 bg-white/30' : 'bg-white/80 hover:bg-white'}`}>
        {isEditing ? (
            // --- EDIT MODE ---
            <div className="space-y-3 animate-fade-in">
                <div className="flex gap-2">
                    <input 
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        autoFocus
                    />
                </div>
                
                <div className="flex gap-2">
                    <select 
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 outline-none"
                    >
                        <option>General</option>
                        <option>Restoration</option>
                        <option>Funding</option>
                        <option>Onboarding</option>
                    </select>
                    <select 
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 outline-none"
                    >
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                    </select>
                </div>

                <div className="relative">
                    <LinkIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        value={editLink}
                        onChange={(e) => setEditLink(e.target.value)}
                        placeholder="Paste website link..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2 py-1.5 text-[11px] font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                    <button 
                        onClick={() => setIsEditing(false)}
                        className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        <X size={14} />
                    </button>
                    <button 
                        onClick={() => {
                            if (task.id && onUpdate) {
                                onUpdate(task.id, {
                                    title: editTitle,
                                    category: editCategory,
                                    priority: editPriority,
                                    websiteLink: editLink
                                });
                            }
                            setIsEditing(false);
                        }}
                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Save size={14} />
                    </button>
                </div>
            </div>
        ) : (
            // --- VIEW MODE ---
            <div className="flex items-center gap-3 pr-12">
                {/* iOS Radio Toggle */}
                <button 
                    onClick={() => onToggle(task.id, task.status)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0
                        ${isComplete 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'bg-white border-slate-300 hover:border-blue-400'}
                    `}
                >
                    {isComplete && <div className="w-2 h-2 bg-white rounded-full" />}
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                        <h4 className={`font-bold text-sm transition-all truncate ${isComplete ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            {task.title}
                        </h4>
                        {task.priority === 'High' && !isComplete && (
                            <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full animate-pulse flex-shrink-0">
                                    <AlertCircle size={8} /> High Priority
                                </span>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md
                            ${task.category === 'Restoration' ? 'bg-purple-50 text-purple-600' :
                            task.category === 'Funding' ? 'bg-emerald-50 text-emerald-600' :
                            'bg-slate-100 text-slate-500'}
                        `}>
                            {task.category}
                        </span>
                        {task.dueDate && (
                            <span className="flex items-center gap-1 text-[9px] font-medium text-slate-400">
                                <Calendar size={9} />
                                {new Date(task.dueDate.seconds ? task.dueDate.toDate() : task.dueDate).toLocaleDateString()}
                            </span>
                        )}
                        
                        {/* CONDITIONAL WEBSITE LINK */}
                        {task.websiteLink && (
                            <a 
                                href={formatUrl(task.websiteLink)} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-1 text-[9px] font-bold text-blue-500 hover:text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Globe size={9} /> Link
                            </a>
                        )}
                    </div>
                </div>

                {/* Hover Actions */}
                <div className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-white/80 backdrop-blur-sm rounded-lg pl-2">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                        }}
                        className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-md hover:bg-blue-50"
                        title="Edit Task"
                    >
                        <Edit2 size={14} />
                    </button>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(task.id);
                        }}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50"
                        title="Delete Task"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        )}
    </LiquidGlassCard>
  );
};