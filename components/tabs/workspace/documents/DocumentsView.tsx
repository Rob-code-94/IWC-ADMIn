import React, { useState, useEffect } from 'react';
import { Client, ClientDocument } from '@/types';
import { db } from '@/services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { Folder, FileText, UploadCloud, Download, Image as ImageIcon, File } from 'lucide-react';

interface DocumentsViewProps {
  client: Client;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ client }) => {
  const [docs, setDocs] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Upload State
  const [uploadCategory, setUploadCategory] = useState('Other');
  const [uploadType, setUploadType] = useState('Other');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!client.id) return;
    setLoading(true);
    const q = query(collection(db, 'clients', client.id, 'documents'), orderBy('uploadedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientDocument));
        setDocs(data);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [client.id]);

  const handleSimulatedUpload = async () => {
    setIsUploading(true);
    // SIMULATION: In real app, upload to Firebase Storage here, get URL, then save to Firestore.
    setTimeout(async () => {
        try {
            await addDoc(collection(db, 'clients', client.id, 'documents'), {
                name: `Uploaded_Doc_${Math.floor(Math.random() * 1000)}.pdf`,
                type: uploadType,
                category: uploadCategory,
                url: '#', // Placeholder
                size: '1.2 MB',
                uploadedAt: serverTimestamp()
            });
        } catch (e) {
            console.error("Upload error:", e);
        } finally {
            setIsUploading(false);
        }
    }, 1500);
  };

  const getIcon = (type: string) => {
    switch(type) {
        case 'ID': return <ImageIcon size={18} />;
        case 'SSN': return <ShieldCheck size={18} />;
        case 'Utility': return <Home size={18} />;
        default: return <FileText size={18} />;
    }
  };

  const categories = ['Consulting', 'Restoration', 'Funding', 'Other'];

  return (
    <div className="flex h-full gap-8 animate-fade-in">
        
        {/* LEFT COLUMN: Folder Feed */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10 space-y-8">
            {categories.map(cat => {
                const catDocs = docs.filter(d => d.category === cat);
                if (catDocs.length === 0) return null;

                return (
                    <div key={cat} className="space-y-3">
                        <div className="flex items-center gap-2 pl-2">
                            <Folder size={16} className="text-blue-500" />
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{cat}</h3>
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{catDocs.length}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {catDocs.map(doc => (
                                <LiquidGlassCard key={doc.id} className="flex items-center justify-between p-4 group hover:bg-white hover:scale-[1.01] transition-all cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                            {doc.type === 'ID' || doc.type === 'SSN' ? <ImageIcon size={20} /> : <FileText size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">{doc.name}</h4>
                                            <p className="text-xs text-slate-400 font-medium">
                                                {doc.type} • {doc.size} • {doc.uploadedAt ? new Date(doc.uploadedAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                            </p>
                                        </div>
                                    </div>
                                    <button className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                                        <Download size={18} />
                                    </button>
                                </LiquidGlassCard>
                            ))}
                        </div>
                    </div>
                );
            })}
            
            {docs.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center h-64 text-center opacity-60">
                    <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-4 text-slate-400">
                        <Folder size={32} />
                    </div>
                    <p className="font-bold text-slate-600">Vault Empty</p>
                    <p className="text-sm text-slate-500">Upload documents to get started.</p>
                </div>
            )}
        </div>

        {/* RIGHT COLUMN: Quick Upload (384px Fixed) */}
        <div className="w-[384px] flex-shrink-0 flex flex-col gap-6">
            <LiquidGlassCard className="bg-white/60 border-blue-200/50">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
                    <UploadCloud size={16} className="text-blue-500" /> Secure Upload
                </h3>

                <div className="space-y-4">
                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category</label>
                            <select 
                                value={uploadCategory}
                                onChange={(e) => setUploadCategory(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                            >
                                {categories.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Doc Type</label>
                            <select 
                                value={uploadType}
                                onChange={(e) => setUploadType(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                            >
                                <option>ID</option>
                                <option>SSN</option>
                                <option>Utility</option>
                                <option>Report</option>
                                <option>Contract</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Dropzone */}
                    <div 
                        onClick={handleSimulatedUpload}
                        className={`
                            border-2 border-dashed border-slate-300 rounded-[2rem] h-48 flex flex-col items-center justify-center text-center cursor-pointer transition-all
                            ${isUploading ? 'bg-blue-50 border-blue-400 opacity-50 cursor-wait' : 'hover:bg-white hover:border-blue-400 group'}
                        `}
                    >
                        <div className={`w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3 transition-colors ${!isUploading && 'group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                            {isUploading ? <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" /> : <UploadCloud size={24} className="text-slate-400 group-hover:text-blue-600" />}
                        </div>
                        <p className="text-sm font-bold text-slate-700">{isUploading ? 'Encrypting & Uploading...' : 'Tap to Upload'}</p>
                        <p className="text-[10px] text-slate-400 mt-1">PDF, PNG, JPG (Max 25MB)</p>
                    </div>
                </div>
            </LiquidGlassCard>

            <LiquidGlassCard className="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none flex flex-col justify-center items-center text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-4 backdrop-blur-md">
                    <File size={32} className="text-blue-300" />
                </div>
                <h3 className="text-lg font-bold mb-2">Vault Statistics</h3>
                <div className="flex gap-8 mt-4">
                    <div>
                        <p className="text-2xl font-bold">{docs.length}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Files</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">
                            {docs.filter(d => d.category === 'Restoration').length}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Disputes</p>
                    </div>
                </div>
            </LiquidGlassCard>
        </div>
    </div>
  );
};

// Helper for icon import fix if needed
import { ShieldCheck, Home } from 'lucide-react';
