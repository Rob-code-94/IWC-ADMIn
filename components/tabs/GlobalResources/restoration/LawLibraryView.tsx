import React, { useState, useEffect } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { ArrowLeft, Search, Plus, Scale, FileText, Video, Book, Download, Loader2 } from 'lucide-react';
import { db } from '@/services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { AddResourceModal } from './AddResourceModal';

interface LawLibraryViewProps {
  onBack: () => void;
}

interface LawResource {
  id: string;
  title: string;
  category: string;
  type: 'PDF' | 'Video' | 'Link' | 'Doc';
  description?: string;
  url?: string;
  createdAt: any;
}

export const LawLibraryView: React.FC<LawLibraryViewProps> = ({ onBack }) => {
  const [resources, setResources] = useState<LawResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Categories
  const categories = ['All', 'FCRA', 'FDCPA', 'FACTA', 'Dispute Templates', 'Metro2'];

  useEffect(() => {
    const q = query(collection(db, 'law_library_docs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LawResource)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || res.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getIcon = (type: string) => {
    switch(type) {
      case 'Video': return <Video size={18} />;
      case 'Link': return <Book size={18} />;
      default: return <FileText size={18} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'Video': return 'bg-red-50 text-red-600';
      case 'Link': return 'bg-purple-50 text-purple-600';
      default: return 'bg-blue-50 text-blue-600';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 h-full flex flex-col">
      <AddResourceModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

      {/* Header */}
      <div className="flex flex-col gap-6 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Restoration Vault</h2>
              <p className="text-slate-500 font-medium">Federal laws, compliance guides & master templates.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative group flex-1 md:flex-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search legal docs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-80 bg-white border border-slate-200 rounded-full py-3.5 pl-12 pr-6 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-slate-900/5 outline-none shadow-sm transition-all"
              />
            </div>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="h-12 w-12 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
              title="Add Resource"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap
                ${activeCategory === cat 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}
              `}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 pb-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="animate-spin text-slate-300 mb-4" size={32} />
            <p className="text-slate-400 font-bold text-sm">Accessing Law Library...</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/40 rounded-[2.5rem] border border-dashed border-slate-300 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
              <Scale size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Vault Empty</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
              No legal resources found for "{activeCategory}".
            </p>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-full font-bold text-xs shadow-lg hover:bg-slate-800 transition-colors"
            >
              Add First Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map(res => (
              <LiquidGlassCard key={res.id} className="group hover:bg-white hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${getTypeColor(res.type)}`}>
                    {getIcon(res.type)}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-md">{res.category}</span>
                </div>
                
                <div className="space-y-2 mb-6">
                  <h3 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">{res.title}</h3>
                  <p className="text-xs text-slate-500 font-medium line-clamp-2">{res.description || "No description provided."}</p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400">
                    Added {res.createdAt?.seconds ? new Date(res.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                  </span>
                  <button className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
                    <Download size={16} />
                  </button>
                </div>
              </LiquidGlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};