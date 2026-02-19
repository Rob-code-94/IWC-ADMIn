import React, { useState, useEffect, useRef } from 'react';
import { Client, LoginCredential, ClientDocument } from '@/types';
import { db, storage, subscribeToLogins } from '@/services/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { LoginVaultItem } from '../logins/LoginVaultItem';
import { AddLoginModal } from '../logins/AddLoginModal';
import { EditDocumentModal } from './EditDocumentModal';
import { ShieldCheck, Plus, Folder, FileText, UploadCloud, Download, Image as ImageIcon, Shield, Edit2, ExternalLink, Loader2 } from 'lucide-react';

interface VaultViewProps {
  client: Client;
}

export const VaultView: React.FC<VaultViewProps> = ({ client }) => {
  // --- CREDENTIAL STATE ---
  const [logins, setLogins] = useState<LoginCredential[]>([]);
  const [loadingLogins, setLoadingLogins] = useState(true);
  const [isAddLoginModalOpen, setIsAddLoginModalOpen] = useState(false);

  // --- DOCUMENT STATE ---
  const [docs, setDocs] = useState<ClientDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploadCategory, setUploadCategory] = useState('Other');
  const [uploadType, setUploadType] = useState('Other');
  const [isUploading, setIsUploading] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ClientDocument | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- FETCH CREDENTIALS ---
  useEffect(() => {
    if (!client.id) return;
    const unsubscribe = subscribeToLogins(client.id, (data) => {
        setLogins(data);
        setLoadingLogins(false);
    });
    return () => unsubscribe();
  }, [client.id]);

  // --- FETCH DOCUMENTS ---
  useEffect(() => {
    if (!client.id) return;
    const q = query(collection(db, 'clients', client.id, 'documents'), orderBy('uploadedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientDocument)));
        setLoadingDocs(false);
    });
    return () => unsubscribe();
  }, [client.id]);

  // --- HANDLERS (CREDENTIALS) ---
  const handleUpdateLogin = async (id: string, data: Partial<LoginCredential>) => {
    await updateDoc(doc(db, 'clients', client.id, 'logins', id), data);
  };
  const handleDeleteLogin = async (id: string) => {
    if (confirm('Are you sure you want to delete this credential?')) {
        await deleteDoc(doc(db, 'clients', client.id, 'logins', id));
    }
  };

  // --- HANDLERS (DOCUMENTS) ---
  const handleRealUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setIsUploading(true);
        const file = e.target.files[0];
        try {
            // 1. Upload to Firebase Storage
            const storageRef = ref(storage, `clients/${client.id}/documents/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);

            // 2. Save Metadata to Firestore
            await addDoc(collection(db, 'clients', client.id, 'documents'), {
                name: file.name,
                type: uploadType,
                category: uploadCategory,
                url: downloadUrl,
                size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                uploadedAt: serverTimestamp()
            });
        } catch (err) {
            console.error("Upload failed", err);
            alert("Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }
  };

  const handleUpdateDocument = async (id: string, data: Partial<ClientDocument>) => {
      await updateDoc(doc(db, 'clients', client.id, 'documents', id), data);
  };

  const handleDeleteDocument = async (id: string) => {
      await deleteDoc(doc(db, 'clients', client.id, 'documents', id));
  };

  const openDocument = (url?: string) => {
      if (url && url !== '#') {
          window.open(url, '_blank');
      } else {
          alert("Document preview not available (Invalid URL). Use the edit button to fix the link or upload a real file.");
      }
  };

  // Group Logins
  const groupedLogins = logins.reduce((acc, login) => {
    const category = login.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(login);
    return acc;
  }, {} as Record<string, LoginCredential[]>);

  const loginCategoryOrder = ['Credit Monitoring', 'Banking & Finance', 'Utility / Misc', 'Other'];
  const sortedLoginCategories = Object.keys(groupedLogins).sort((a, b) => {
      const idxA = loginCategoryOrder.indexOf(a);
      const idxB = loginCategoryOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
  });

  const docCategories = ['Consulting', 'Restoration', 'Funding', 'Other'];

  return (
    <div className="flex h-full gap-8 animate-fade-in relative">
      <AddLoginModal 
        isOpen={isAddLoginModalOpen} 
        onClose={() => setIsAddLoginModalOpen(false)} 
        clientId={client.id} 
      />
      
      {editingDoc && (
          <EditDocumentModal 
              isOpen={!!editingDoc}
              onClose={() => setEditingDoc(null)}
              document={editingDoc}
              onSave={handleUpdateDocument}
              onDelete={handleDeleteDocument}
          />
      )}

      {/* LEFT COLUMN: CREDENTIAL VAULT */}
      <div className="flex-1 flex flex-col min-h-0">
         <div className="flex justify-between items-center mb-6 pl-1">
             <div className="flex items-center gap-3">
                 <div className="p-2 bg-slate-200 rounded-lg text-slate-700">
                    <ShieldCheck size={20} />
                 </div>
                 <div>
                    <h2 className="text-xl font-bold text-slate-900">Credential Vault</h2>
                    <p className="text-xs text-slate-500 font-medium">Secure access points & passwords.</p>
                 </div>
             </div>
             <button 
                onClick={() => setIsAddLoginModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
             >
                <Plus size={14} /> Add Login
             </button>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10 space-y-8">
            {sortedLoginCategories.map((category) => (
                <div key={category} className="space-y-4">
                    <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1 sticky top-0 bg-[#F2F2F7]/95 backdrop-blur-sm z-10 py-2 border-b border-transparent">
                        {category}
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                        {groupedLogins[category].map(cred => (
                            <LoginVaultItem 
                                key={cred.id} 
                                credential={cred} 
                                onUpdate={handleUpdateLogin}
                                onDelete={handleDeleteLogin}
                            />
                        ))}
                    </div>
                </div>
            ))}
            
            {logins.length === 0 && !loadingLogins && (
                <div className="flex flex-col items-center justify-center h-48 text-center opacity-60 bg-white/40 rounded-[2rem] border border-dashed border-slate-300">
                    <Shield size={32} className="text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-500">No credentials stored</p>
                </div>
            )}
         </div>
      </div>

      {/* RIGHT COLUMN: DOCUMENT VAULT */}
      <div className="w-[480px] flex-shrink-0 flex flex-col gap-6 h-full min-h-0">
         
         {/* Upload Zone */}
         <div className="flex-shrink-0">
             <LiquidGlassCard className="bg-white/60 border-blue-200/50">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                    <UploadCloud size={16} className="text-blue-500" /> Secure Upload
                </h3>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <select 
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                    >
                        {docCategories.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <select 
                        value={uploadType}
                        onChange={(e) => setUploadType(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                    >
                        <option>ID</option><option>SSN</option><option>Utility</option><option>Report</option><option>Contract</option><option>Other</option>
                    </select>
                </div>

                <div 
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className={`
                        border-2 border-dashed border-slate-300 rounded-[1.5rem] h-24 flex flex-col items-center justify-center text-center cursor-pointer transition-all
                        ${isUploading ? 'bg-blue-50 border-blue-400 opacity-50 cursor-wait' : 'hover:bg-white hover:border-blue-400 group'}
                    `}
                >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleRealUpload} 
                    />
                    
                    {isUploading ? (
                        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                            <Loader2 className="animate-spin" size={20} />
                            Uploading & Encrypting...
                        </div>
                    ) : (
                        <>
                            <UploadCloud size={20} className="text-slate-400 group-hover:text-blue-600 mb-1" />
                            <p className="text-xs font-bold text-slate-600">Tap to Upload File</p>
                        </>
                    )}
                </div>
             </LiquidGlassCard>
         </div>

         {/* File Explorer Stack */}
         <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
             <div className="flex items-center gap-2 mb-4 pl-1">
                 <Folder size={16} className="text-slate-400" />
                 <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">File Explorer</h3>
             </div>

             <div className="space-y-6">
                {docCategories.map(cat => {
                    const catDocs = docs.filter(d => d.category === cat);
                    if (catDocs.length === 0) return null;

                    return (
                        <div key={cat} className="space-y-2">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase ml-2 bg-slate-100/50 w-fit px-2 py-0.5 rounded-md">{cat}</h4>
                            <div className="space-y-2">
                                {catDocs.map(doc => (
                                    <LiquidGlassCard 
                                        key={doc.id} 
                                        className="!p-3 flex items-center justify-between group hover:bg-white hover:scale-[1.01] transition-all cursor-pointer border border-transparent hover:border-blue-100"
                                        onClick={() => openDocument(doc.url)}
                                        title={doc.url === '#' ? "No file attached (Placeholder)" : "Click to View"}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors flex-shrink-0">
                                                {doc.type === 'ID' || doc.type === 'SSN' ? <ImageIcon size={14} /> : <FileText size={14} />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 text-xs truncate group-hover:text-blue-700 transition-colors">{doc.name}</p>
                                                <p className="text-xs text-slate-400 font-medium truncate">
                                                    {doc.type} • {doc.size}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setEditingDoc(doc); }}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit Details"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); openDocument(doc.url); }}
                                                className={`p-1.5 rounded-lg transition-colors ${doc.url === '#' ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                                title="Open Document"
                                            >
                                                <ExternalLink size={14} />
                                            </button>
                                        </div>
                                    </LiquidGlassCard>
                                ))}
                            </div>
                        </div>
                    );
                })}
                {docs.length === 0 && !loadingDocs && (
                    <div className="text-center py-8 opacity-50">
                        <p className="text-xs font-bold text-slate-400">Vault is empty</p>
                    </div>
                )}
             </div>
         </div>
      </div>
    </div>
  );
};