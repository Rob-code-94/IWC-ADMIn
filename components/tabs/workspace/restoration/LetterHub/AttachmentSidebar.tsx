import React, { useState, useEffect, useRef } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { Paperclip, UploadCloud, Plus, Check, X, FileText, Image as ImageIcon, Loader2, RefreshCw } from 'lucide-react';
import { db, storage } from '@/services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ClientDocument } from '@/types';

interface AttachmentSidebarProps {
  clientId: string;
  attachedDocs: string[]; // Array of URLs
  onAttach: (doc: ClientDocument) => void;
  onDetach: (url: string) => void;
}

export const AttachmentSidebar: React.FC<AttachmentSidebarProps> = ({ clientId, attachedDocs, onAttach, onDetach }) => {
  const [vaultDocs, setVaultDocs] = useState<ClientDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Vault Docs
  useEffect(() => {
    const q = query(collection(db, 'clients', clientId, 'documents'), orderBy('uploadedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
        setVaultDocs(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClientDocument)));
    });
    return () => unsub();
  }, [clientId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setIsUploading(true);
          const file = e.target.files[0];
          try {
              // 1. Upload to Storage
              const storageRef = ref(storage, `clients/${clientId}/documents/${Date.now()}_${file.name}`);
              await uploadBytes(storageRef, file);
              const url = await getDownloadURL(storageRef);

              // 2. Add to Vault (Firestore)
              const docRef = await addDoc(collection(db, 'clients', clientId, 'documents'), {
                  name: file.name,
                  type: file.type.includes('image') ? 'ID' : 'Report', // Simple inference
                  category: 'Restoration',
                  url: url,
                  size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                  uploadedAt: serverTimestamp()
              });

              // 3. Auto-attach to current letter
              onAttach({
                  id: docRef.id,
                  name: file.name,
                  url: url,
                  type: 'Report',
                  category: 'Restoration'
              } as ClientDocument);

          } catch (err) {
              console.error("Upload failed", err);
          } finally {
              setIsUploading(false);
          }
      }
  };

  const isAttached = (url?: string) => url && attachedDocs.includes(url);

  // Filter vault docs to only show Restoration category as requested
  const restorationDocs = vaultDocs.filter(doc => doc.category === 'Restoration');

  return (
    <div className="w-80 border-l border-slate-200/60 bg-white/40 backdrop-blur-md flex flex-col h-full flex-shrink-0 transition-all duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-200/50 flex items-center gap-2 bg-white/50">
            <Paperclip size={16} className="text-slate-400" />
            <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Proof & Evidence</span>
            <span className="ml-auto bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{attachedDocs.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
            
            {/* 1. Upload Zone */}
            <div 
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group
                    ${isUploading ? 'bg-slate-50 opacity-50 cursor-wait' : 'hover:border-blue-400 hover:bg-white/60'}
                `}
            >
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept="application/pdf,image/*" />
                {isUploading ? (
                    <Loader2 size={24} className="animate-spin text-blue-500 mb-2" />
                ) : (
                    <UploadCloud size={24} className="text-slate-300 group-hover:text-blue-500 mb-2 transition-colors" />
                )}
                <p className="text-xs font-bold text-slate-600">{isUploading ? 'Uploading...' : 'Upload Evidence'}</p>
                <p className="text-[10px] text-slate-400">PDFs, Reports, ID scans</p>
            </div>

            {/* 2. Attached List (Active) */}
            {attachedDocs.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Attached to Draft</h4>
                    {attachedDocs.map((url, idx) => {
                        // Find matching doc metadata if possible, else show generic
                        const docMeta = vaultDocs.find(d => d.url === url);
                        return (
                            <div key={idx} className="flex items-center gap-3 p-2 bg-blue-50 rounded-xl border border-blue-100 group">
                                <div className="p-1.5 bg-white rounded-lg text-blue-500">
                                    <FileText size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-blue-900 truncate">{docMeta?.name || 'Attached Document'}</p>
                                </div>
                                <button 
                                    onClick={() => onDetach(url)}
                                    className="p-1.5 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 3. Vault Picker (Restoration Only) */}
            <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Vault (Restoration)</h4>
                    <RefreshCw size={12} className="text-slate-300" />
                </div>
                
                <div className="space-y-2">
                    {restorationDocs.map(doc => {
                        const active = isAttached(doc.url);
                        return (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-all">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400">
                                        {doc.type === 'ID' ? <ImageIcon size={14} /> : <FileText size={14} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate max-w-[140px]">{doc.name}</p>
                                        <p className="text-[10px] text-slate-400">{doc.category}</p>
                                    </div>
                                </div>
                                {active ? (
                                    <div className="p-1.5 bg-green-100 text-green-600 rounded-full">
                                        <Check size={12} strokeWidth={3} />
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => doc.url && onAttach(doc)}
                                        className="p-1.5 bg-slate-100 text-slate-400 hover:bg-blue-500 hover:text-white rounded-lg transition-colors"
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    {restorationDocs.length === 0 && (
                        <p className="text-center text-xs text-slate-400 py-4 italic">No restoration documents found.</p>
                    )}
                </div>
            </div>

        </div>
    </div>
  );
};