import React, { useState, useRef } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { X, Save, Scale, UploadCloud, FileText, Folder, Trash2, CheckCircle2 } from 'lucide-react';
import { VoiceTextArea } from '@/components/ui/VoiceTextArea';
import { db } from '@/services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddResourceModal: React.FC<AddResourceModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'FCRA',
    type: 'PDF',
    description: '',
    url: ''
  });
  const [files, setFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Explicitly cast to File[] to avoid 'unknown' type errors if TS doesn't infer correctly
      const selectedFiles = Array.from(e.target.files) as File[];
      // Filter out system files like .DS_Store if needed, but usually fine
      const validFiles = selectedFiles.filter(f => !f.name.startsWith('.'));
      
      setFiles(prev => [...prev, ...validFiles]);
      
      // Auto-populate title if it's the first single file and title is empty
      if (validFiles.length === 1 && files.length === 0 && !formData.title) {
         setFormData(prev => ({...prev, title: validFiles[0].name.replace(/\.[^/.]+$/, "")}));
      }
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    if (newFiles.length === 0) {
        setFormData(prev => ({ ...prev, title: '' }));
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0 && !formData.title) return;
    
    setIsSaving(true);
    try {
      if (files.length > 0) {
        // BULK UPLOAD MODE
        const promises = files.map(file => {
           // Infer type from extension/mime
           let type = 'Doc';
           if (file.type.includes('pdf')) type = 'PDF';
           else if (file.type.includes('video')) type = 'Video';
           else if (file.name.endsWith('.pdf')) type = 'PDF';
           
           // Use manual title if only 1 file and user edited it, otherwise file name
           const docTitle = (files.length === 1 && formData.title) 
              ? formData.title 
              : file.name.replace(/\.[^/.]+$/, ""); // Remove extension

           return addDoc(collection(db, 'law_library_docs'), {
             title: docTitle,
             category: formData.category,
             type: type, // Derived from file
             description: formData.description || '',
             url: '#', // Placeholder for actual storage URL
             originalName: file.name,
             size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
             createdAt: serverTimestamp()
           });
        });
        await Promise.all(promises);
      } else {
        // MANUAL ENTRY MODE
        await addDoc(collection(db, 'law_library_docs'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      
      onClose();
      // Reset State
      setFormData({ title: '', category: 'FCRA', type: 'PDF', description: '', url: '' });
      setFiles([]);
    } catch (e) {
      console.error("Error adding resource:", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <LiquidGlassCard className="w-full max-w-xl relative z-10 !p-0 overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/40 bg-white/50 backdrop-blur-md flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <Scale size={20} />
            </div>
            <div>
                <h3 className="font-bold text-slate-900 text-xl">Add Legal Resource</h3>
                <p className="text-xs text-slate-500 font-medium">
                    {files.length > 0 ? `${files.length} Files Selected` : 'Single Entry or Bulk Upload'}
                </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 bg-slate-50/50 overflow-y-auto custom-scrollbar flex-1">
          
          {/* 1. File Selection Area */}
          <div className="space-y-2">
             <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Document Source</label>
             <div className="grid grid-cols-2 gap-4">
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white hover:border-blue-400 transition-all group bg-slate-50/50"
                 >
                    <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect} 
                    />
                    <UploadCloud size={24} className="text-slate-400 group-hover:text-blue-500 mb-2 transition-colors" />
                    <span className="text-xs font-bold text-slate-600">Select Files</span>
                 </div>
                 
                 <div 
                    onClick={() => folderInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white hover:border-purple-400 transition-all group bg-slate-50/50"
                 >
                    <input 
                        type="file" 
                        multiple 
                        {...{ webkitdirectory: "", directory: "" } as any}
                        className="hidden" 
                        ref={folderInputRef} 
                        onChange={handleFileSelect} 
                    />
                    <Folder size={24} className="text-slate-400 group-hover:text-purple-500 mb-2 transition-colors" />
                    <span className="text-xs font-bold text-slate-600">Upload Folder</span>
                 </div>
             </div>
          </div>

          {/* 2. File Queue Display */}
          {files.length > 0 && (
              <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Upload Queue</label>
                      <button onClick={() => setFiles([])} className="text-[10px] font-bold text-red-400 hover:text-red-600">Clear All</button>
                  </div>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar border border-slate-200 rounded-xl bg-white/50 p-2 space-y-1">
                      {files.map((file, i) => (
                          <div key={i} className="flex items-center justify-between p-2 hover:bg-white rounded-lg group transition-colors">
                              <div className="flex items-center gap-2 overflow-hidden">
                                  <FileText size={14} className="text-blue-500 flex-shrink-0" />
                                  <span className="text-xs font-medium text-slate-700 truncate max-w-[250px]">{file.name}</span>
                                  <span className="text-[10px] text-slate-400">({(file.size/1024).toFixed(0)}kb)</span>
                              </div>
                              <button onClick={() => removeFile(i)} className="p-1 text-slate-300 hover:text-red-500 rounded-md">
                                  <Trash2 size={12} />
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* 3. Metadata Form */}
          <div className="space-y-4 pt-4 border-t border-slate-200/60">
            {files.length <= 1 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Document Title</label>
                  <input 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. 609 Dispute Letter Template"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none"
                  />
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 outline-none"
                >
                  <option>FCRA</option>
                  <option>FDCPA</option>
                  <option>FACTA</option>
                  <option>Metro2</option>
                  <option>Dispute Templates</option>
                  <option>Guides</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Format</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 outline-none"
                  disabled={files.length > 0} // Auto-detect for files
                >
                  <option>PDF</option>
                  <option>Doc</option>
                  <option>Video</option>
                  <option>Link</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Description {files.length > 1 && "(Applies to all)"}</label>
              <VoiceTextArea 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief summary of this resource..."
                rows={3}
                className="bg-white border-slate-200"
              />
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={isSaving || (files.length === 0 && !formData.title)}
            className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-bold text-lg shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? 'Processing...' : (
                <>
                    <Save size={20} /> 
                    {files.length > 1 ? `Add ${files.length} Documents` : 'Add to Vault'}
                </>
            )}
          </button>
        </div>
      </LiquidGlassCard>
    </div>
  );
};