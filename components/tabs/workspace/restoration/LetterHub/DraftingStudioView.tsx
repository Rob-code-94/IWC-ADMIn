import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Client, ClientDocument } from '@/types';
import { db, updateLetterStatus, updateLetterAttachments, functions } from '@/services/firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { VoiceTextArea } from '@/components/ui/VoiceTextArea';
import { 
  CheckSquare, Square, StickyNote, Printer, Copy, RefreshCw, PenTool, 
  Lightbulb, Wand2, Loader2, Eraser,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Type, Heading1, Heading2, Quote, Undo, Redo, Strikethrough,
  Layers, Maximize, Minimize, PanelLeftClose, PanelLeftOpen, ChevronRight, Tag,
  ChevronDown, ChevronUp, ChevronLeft, User, MapPin, CheckCircle2, Clock, Download,
  AlertTriangle, Archive, Gavel
} from 'lucide-react';
import { generateDisputeDraft } from '@/services/letterGeneration';
import { AttachmentSidebar } from './AttachmentSidebar';

interface DraftingStudioViewProps {
  client: Client;
  initialLetter?: {
      id: string;
      content: string;
      bureau: string;
      status?: string;
      attachedProofs?: string[];
      accountIds?: string[];
  };
  onBack?: () => void;
  mode?: 'standard' | 'standalone';
}

interface AuditDoc {
  id: string;
  accountName: string;
  bureau: string;
  consultantNotesUsed?: string;
  reportDateUsed?: string;
  accountType?: string; 
  status?: string;
  accountStatus?: string;      
  analysis?: {
    violation_list?: Array<{
        law_violated: string;
        error_description: string;
        recommended_dispute: string;
    }>;
    account_name?: string;
  };
}

const BUREAU_ADDRESSES: Record<string, string[]> = {
    'Experian': ['P.O. Box 4500', 'Allen, TX 75013'],
    'Equifax': ['P.O. Box 740256', 'Atlanta, GA 30374'],
    'TransUnion': ['P.O. Box 2000', 'Chester, PA 19016']
};

export const DraftingStudioView: React.FC<DraftingStudioViewProps> = ({ client, initialLetter, onBack, mode = 'standard' }) => {
  const [audits, setAudits] = useState<AuditDoc[]>([]);
  const [selectedBureau, setSelectedBureau] = useState(initialLetter?.bureau || 'Experian');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialLetter?.accountIds || []));
  const [disputeRound, setDisputeRound] = useState("1");
  const [letterStatus, setLetterStatus] = useState(initialLetter?.status || 'Draft');
  
  // Status Tracking Engine
  const [disputedAccountIds, setDisputedAccountIds] = useState<Set<string>>(new Set());
  
  // Attachments State
  const [attachedProofs, setAttachedProofs] = useState<string[]>(initialLetter?.attachedProofs || []);

  // UI State
  const [isSidebarOpen, setSidebarOpen] = useState(mode === 'standard');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isListExpanded, setIsListExpanded] = useState(false); // Collapsible list state
  const [isBureauMenuOpen, setIsBureauMenuOpen] = useState(false);
  
  // Categorization State
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
      'Charge-Offs': true,
      'Collections': true,
      'Late Payments': true,
      'Public Records': true,
      'Inquiries': true,
      'Active Accounts': true
  });

  // Generation State
  const [letterBody, setLetterBody] = useState(initialLetter?.content || ''); 
  const [evidenceGuide, setEvidenceGuide] = useState('');
  const [userContext, setUserContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Editor Ref
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountTimeRef = useRef(new Date());

  // Helper to generate template with Client & Bureau info
  const getLetterTemplate = (bureau: string) => {
      const address = BUREAU_ADDRESSES[bureau] || [];
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const clientName = client.name || `${client.firstName} ${client.lastName}`;
      
      return `
        <div style="font-family: 'Times New Roman', serif; color: black; line-height: 1.4;">
            <p style="margin-bottom: 0;"><strong>${clientName}</strong></p>
            <p style="margin: 0;">${client.address || 'Address Not On File'}</p>
            <p style="margin: 0;">SSN: ${client.ssn || '---'}</p>
            <p style="margin: 0;">DOB: ${client.dob || '---'}</p>
            <br/>
            <p>${dateStr}</p>
            <br/>
            <p style="margin-bottom: 0;"><strong>${bureau}</strong></p>
            <p style="margin: 0;">${address[0] || ''}</p>
            <p style="margin: 0;">${address[1] || ''}</p>
            <br/>
            <br/>
            <p>To Whom It May Concern:</p>
            <br/>
        </div>
      `;
  };

  // Fullscreen Listener
  useEffect(() => {
    const handleFsChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
  };

  // 1. Fetch Audits
  useEffect(() => {
    if (!client.id || mode === 'standalone') return;
    const q = query(collection(db, 'clients', client.id, 'account_audits'));
    const unsub = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditDoc));
        setAudits(data);
        setLoading(false);
    });
    return () => unsub();
  }, [client.id, mode]);

  // 1.5. Fetch Existing Letters to Populate "In Dispute" Status
  useEffect(() => {
      if (!client.id) return;
      const q = query(collection(db, 'clients', client.id, 'letters'));
      const unsub = onSnapshot(q, (snapshot) => {
          const disputedIds = new Set<string>();
          snapshot.docs.forEach(doc => {
              const data = doc.data();
              if (initialLetter && doc.id === initialLetter.id) return;
              
              if (data.accountIds && Array.isArray(data.accountIds)) {
                  data.accountIds.forEach((id: string) => disputedIds.add(id));
              }
          });
          setDisputedAccountIds(disputedIds);
      });
      return () => unsub();
  }, [client.id, initialLetter]);

  // 2. Listener for Generated Drafts
  useEffect(() => {
    if (!client.id || mode === 'standalone' || initialLetter) return;
    
    const q = query(
        collection(db, 'clients', client.id, 'letters', 'generatedletters', 'drafts'), 
        orderBy('createdAt', 'desc'),
        limit(1)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        if (initialLetter) {
            const created = docData.createdAt?.toDate();
            if (created && created < mountTimeRef.current) {
                return;
            }
        }
        const rawContent = docData.content || '';
        const marker = '### Instructions for sending:';
        const parts = rawContent.split(marker);
        const letterPart = parts[0] || '';
        setLetterBody(letterPart);
        if (editorRef.current) {
            editorRef.current.innerHTML = letterPart;
        }
      }
    });
    return () => unsubscribe();
  }, [client.id, initialLetter, mode]);

  // 3. Initialize Editor
  useEffect(() => {
      if (!letterBody && client && !initialLetter) {
          const t = getLetterTemplate(selectedBureau);
          setLetterBody(t);
          if (editorRef.current) editorRef.current.innerHTML = t;
      }
      if (initialLetter && editorRef.current && !editorRef.current.innerHTML) {
          editorRef.current.innerHTML = initialLetter.content;
      }
  }, [client, initialLetter, selectedBureau]);

  // 4. CATEGORIZATION LOGIC
  const getCategory = (item: AuditDoc) => {
      const str = (
          (item.accountStatus || '') + " " +
          (item.accountType || '') + " " +
          (item.accountName || '')
      ).toLowerCase();

      if (str.includes('charge') || str.includes('loss')) return 'Charge-Offs';
      if (str.includes('collection') || str.includes('repo')) return 'Collections';
      if (str.includes('late') || str.includes('past due') || str.includes('delinq')) return 'Late Payments';
      if (str.includes('inquiry')) return 'Inquiries';
      if (str.includes('bankruptcy') || str.includes('public') || str.includes('judgment')) return 'Public Records';
      return 'Active Accounts'; 
  };

  const filteredAudits = audits.filter(a => 
      (a.bureau || '').toLowerCase() === selectedBureau.toLowerCase()
  );

  const groupedAudits = useMemo(() => {
      const groups: Record<string, AuditDoc[]> = {
          'Charge-Offs': [],
          'Collections': [],
          'Late Payments': [],
          'Public Records': [],
          'Inquiries': [],
          'Active Accounts': []
      };

      filteredAudits.forEach(item => {
          const cat = getCategory(item);
          if (groups[cat]) groups[cat].push(item);
          else groups['Active Accounts'].push(item);
      });

      return groups;
  }, [filteredAudits]);

  const toggleSelection = (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
  };

  const selectAll = () => {
      if (selectedIds.size === filteredAudits.length) {
          setSelectedIds(new Set());
      } else {
          const all = new Set(filteredAudits.map(a => a.id));
          setSelectedIds(all);
      }
  };

  const handleBureauSwitch = (bureau: string) => {
      setSelectedBureau(bureau);
      setSelectedIds(new Set());
      setIsListExpanded(false); 
      
      const template = getLetterTemplate(bureau);
      setLetterBody(template);
      setEvidenceGuide(''); 
      if(editorRef.current) editorRef.current.innerHTML = template;
  };

  const toggleCategory = (cat: string) => {
      setExpandedCategories(prev => ({...prev, [cat]: !prev[cat]}));
  };

  const handleGenerate = async () => {
      if (selectedIds.size === 0) return;
      setIsGenerating(true);
      try {
          const selectedItems = filteredAudits.filter(a => selectedIds.has(a.id));
          const reportDate = selectedItems[0]?.reportDateUsed || new Date().toLocaleDateString('en-US');
          await generateDisputeDraft(
              client.id,
              selectedBureau,
              selectedItems,
              userContext,
              reportDate,
              disputeRound
          );
      } catch (e) {
          console.error(e);
          alert("Failed to generate letter. Please try again.");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleRegenerate = () => {
      if (mode === 'standard') handleGenerate();
  };

  // Quick Injection Functions
  const insertClientHeader = () => {
      const clientName = client.name || `${client.firstName} ${client.lastName}`;
      const headerHtml = `
          <div style="margin-bottom: 1rem;">
              <p style="margin: 0; font-weight: bold;">${clientName}</p>
              <p style="margin: 0;">${client.address || 'Address Not On File'}</p>
              <p style="margin: 0;">SSN: ${client.ssn || '---'}</p>
              <p style="margin: 0;">DOB: ${client.dob || '---'}</p>
          </div>
          <br/>
      `;
      if (editorRef.current) {
          editorRef.current.innerHTML = headerHtml + editorRef.current.innerHTML;
          setLetterBody(editorRef.current.innerHTML);
      }
  };

  const insertBureauAddress = (bureauName: string) => {
      const addr = BUREAU_ADDRESSES[bureauName];
      const html = `
          <div style="margin-bottom: 1rem;">
              <p style="margin: 0; font-weight: bold;">${bureauName}</p>
              <p style="margin: 0;">${addr?.[0] || ''}</p>
              <p style="margin: 0;">${addr?.[1] || ''}</p>
          </div>
          <br/>
      `;
      
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const el = document.createElement("div");
          el.innerHTML = html;
          const frag = document.createDocumentFragment();
          let node;
          while ((node = el.firstChild)) frag.appendChild(node);
          range.insertNode(frag);
      } else if (editorRef.current) {
          editorRef.current.innerHTML = html + editorRef.current.innerHTML;
      }
      setLetterBody(editorRef.current?.innerHTML || '');
      setIsBureauMenuOpen(false);
  };

  const toggleStatus = async () => {
      const next = letterStatus === 'Draft' ? 'Sent' : 'Draft';
      setLetterStatus(next);
      if (initialLetter?.id) {
          try {
              await updateLetterStatus(client.id, initialLetter.id, next);
              await updateLetterAttachments(client.id, initialLetter.id, attachedProofs);
          } catch (e) {
              console.error("Status sync failed", e);
          }
      }
  };

  const handleDownloadPackage = async () => {
      if (!letterBody || letterBody.trim() === '') {
          alert("Please add content to the editor before downloading.");
          return;
      }
      setIsSaving(true);
      try {
          const letterData = {
              bureau: selectedBureau,
              content: letterBody,
              status: letterStatus,
              round: disputeRound || '1',
              items: selectedIds.size,
              accountIds: Array.from(selectedIds), 
              createdAt: serverTimestamp(),
              attachedProofs: attachedProofs
          };

          if (initialLetter) {
              await addDoc(collection(db, 'clients', client.id, 'letters'), {
                  ...letterData,
                  parentLetterId: initialLetter.id
              });
          } else {
              await addDoc(collection(db, 'clients', client.id, 'letters'), letterData);
          }
      } catch (error) {
          console.error("Error saving draft:", error);
          alert("Failed to save draft. Download aborted.");
          setIsSaving(false);
          return;
      }

      setIsDownloading(true);
      try {
          const clientName = client.name || `${client.firstName} ${client.lastName}`;
          const assembleFinalPDF = httpsCallable(functions, 'assembleFinalPDF');
          
          const result = await assembleFinalPDF({
              htmlContent: letterBody,
              attachmentUrls: attachedProofs,
              clientName: clientName,
              bureau: selectedBureau
          });

          const { pdfBase64, fileName } = result.data as { pdfBase64: string, fileName: string };
          
          const link = document.createElement('a');
          link.href = `data:application/pdf;base64,${pdfBase64}`;
          link.download = fileName;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

      } catch (error) {
          console.error("PDF Assembly Failed:", error);
          alert("Failed to generate PDF packet. Please try again.");
      } finally {
          setIsSaving(false);
          setIsDownloading(false);
      }
  };

  const handleAttachDocument = (doc: ClientDocument) => {
      if (doc.url && !attachedProofs.includes(doc.url)) {
          setAttachedProofs([...attachedProofs, doc.url]);
      }
  };

  const handleDetachDocument = (url: string) => {
      setAttachedProofs(attachedProofs.filter(u => u !== url));
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
      document.execCommand(command, false, value);
      editorRef.current?.focus();
  };

  const handleCopy = () => {
      if (editorRef.current) {
          navigator.clipboard.writeText(editorRef.current.innerText);
      }
  };

  const categoryOrder = ['Charge-Offs', 'Collections', 'Late Payments', 'Public Records', 'Inquiries', 'Active Accounts'];

  return (
    <div className="flex h-full animate-fade-in pb-2 relative overflow-hidden">
        
        {/* COLLAPSIBLE SIDEBAR */}
        {mode === 'standard' && (
            <div className={`
                flex-shrink-0 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col transition-all duration-300 ease-in-out h-full
                ${isSidebarOpen ? 'w-[340px] opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full border-none overflow-hidden'}
            `}>
                <div className="flex flex-col h-full min-w-[340px]">
                    <div className="p-4 pb-2">
                        <div className="p-1.5 bg-slate-100/80 rounded-xl flex border border-white/50 shadow-inner">
                            {['Experian', 'Equifax', 'TransUnion'].map(b => (
                                <button
                                    key={b}
                                    onClick={() => handleBureauSwitch(b)}
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all
                                        ${selectedBureau === b ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}
                                    `}
                                >
                                    {b.slice(0,3)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4">
                        <div className="flex justify-between items-center py-2 border-b border-slate-100 mb-2">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                Audited Items ({filteredAudits.length})
                            </h3>
                            <button onClick={selectAll} className="text-[10px] font-bold text-blue-600 hover:underline">
                                {selectedIds.size === filteredAudits.length && filteredAudits.length > 0 ? 'None' : 'All'}
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar py-2 space-y-3">
                            {filteredAudits.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 text-xs font-medium italic">
                                    No items for {selectedBureau}
                                </div>
                            ) : (
                                <>
                                    {categoryOrder.map(cat => {
                                        const items = groupedAudits[cat];
                                        if (!items || items.length === 0) return null;
                                        const isExpanded = expandedCategories[cat];

                                        return (
                                            <div key={cat} className="space-y-1">
                                                <button 
                                                    onClick={() => toggleCategory(cat)}
                                                    className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 py-1"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full 
                                                            ${cat === 'Charge-Offs' ? 'bg-red-500' : 
                                                              cat === 'Collections' ? 'bg-orange-500' :
                                                              cat === 'Late Payments' ? 'bg-yellow-500' :
                                                              'bg-slate-300'}
                                                        `}></div>
                                                        {cat} <span className="opacity-50">({items.length})</span>
                                                    </div>
                                                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                </button>

                                                {isExpanded && (
                                                    <div className="space-y-1 pl-1">
                                                        {items.map(item => {
                                                            const isSelected = selectedIds.has(item.id);
                                                            const violationCount = item.analysis?.violation_list?.length || 0;
                                                            const inDispute = disputedAccountIds.has(item.id);
                                                            const accountStatus = item.accountStatus || 'Check Details';

                                                            return (
                                                                <div 
                                                                    key={item.id}
                                                                    onClick={() => toggleSelection(item.id)}
                                                                    className={`group flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-all border
                                                                        ${isSelected 
                                                                            ? 'bg-blue-50 border-blue-100 shadow-sm' 
                                                                            : 'bg-white/40 hover:bg-white border-transparent hover:border-slate-100'}
                                                                        ${inDispute && !isSelected ? 'shadow-[0_0_10px_rgba(245,158,11,0.05)] border-amber-100/50' : ''}
                                                                    `}
                                                                >
                                                                    <div className={`flex-shrink-0 mt-0.5 ${isSelected ? 'text-blue-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                                                                        {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex justify-between items-start">
                                                                            <p className={`text-[11px] font-bold truncate leading-tight mb-1 ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                                                                                {item.accountName || 'Unknown Account'}
                                                                            </p>
                                                                            {inDispute && (
                                                                                <span className="flex-shrink-0 ml-1 text-[8px] font-black uppercase text-amber-500 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded tracking-tight">
                                                                                    In Dispute
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        {/* STATUS LABEL UI UPDATE */}
                                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                                            <span className="text-rose-400 font-bold text-[11px] bg-rose-400/10 px-2 py-0.5 rounded border border-rose-400/20 truncate max-w-full">
                                                                                {accountStatus}
                                                                            </span>
                                                                            
                                                                            <span className={`text-[9px] font-medium ${violationCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                                                {violationCount} Violations
                                                                            </span>
                                                                            {item.consultantNotesUsed && (
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Has Note" />
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50/80 border-t border-slate-200/60 backdrop-blur-md space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Strategy Context</label>
                            <VoiceTextArea 
                                value={userContext}
                                onChange={(e) => setUserContext(e.target.value)}
                                placeholder="Specific instructions for this round..."
                                className="h-16 bg-white border border-slate-200 rounded-xl text-xs font-medium resize-none shadow-sm focus:border-blue-300"
                            />
                        </div>
                        
                        <div className="flex gap-2">
                            <div className="relative w-1/3">
                                <select
                                    value={disputeRound}
                                    onChange={(e) => setDisputeRound(e.target.value)}
                                    className="w-full h-full pl-3 pr-6 py-0 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
                                >
                                    <option value="1">Round 1</option>
                                    <option value="2">Round 2</option>
                                    <option value="3">Round 3</option>
                                    <option value="4">Round 4</option>
                                    <option value="5">Round 5+</option>
                                </select>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <Layers size={12} />
                                </div>
                            </div>

                            <button 
                                onClick={handleGenerate}
                                disabled={selectedIds.size === 0 || isGenerating}
                                className={`flex-1 py-3 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95
                                    ${selectedIds.size === 0 || isGenerating
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                        : 'bg-[#007AFF] text-white hover:bg-blue-600 shadow-blue-500/30'}
                                `}
                            >
                                {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
                                {isGenerating ? 'Drafting...' : 'Generate Draft'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* MAIN EDITOR AREA */}
        <div ref={containerRef} className={`
            flex-1 flex flex-col min-w-0 h-full transition-all relative
            ${isFullscreen ? 'bg-zinc-800' : ''}
        `}>
            {/* Editor Container */}
            <div className={`
                flex flex-col overflow-hidden transition-all duration-300
                ${isFullscreen ? 'h-screen w-full items-center py-8 overflow-y-auto' : `h-full bg-white shadow-xl ${mode === 'standard' ? 'rounded-l-[2rem] border-l border-slate-200' : 'rounded-[2rem] border border-slate-200'}`}
            `}>
                <div className={`
                    flex flex-col bg-white overflow-hidden transition-all
                    ${isFullscreen 
                        ? 'w-full max-w-[850px] min-h-[1100px] shadow-2xl rounded-sm' 
                        : 'h-full w-full'}
                `}>
                    
                    {/* TOOLBAR HEADER */}
                    <div className="flex flex-col border-b border-slate-200 bg-white/50 backdrop-blur-md z-10">
                        {/* Top Control Bar */}
                        <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                {onBack && (
                                    <button 
                                        onClick={onBack}
                                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                                        title="Back to List"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                )}
                                {!isFullscreen && mode === 'standard' && (
                                    <button 
                                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                                        title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                                    >
                                        {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                                    </button>
                                )}
                                <div className="flex items-center gap-2">
                                    <PenTool size={16} className="text-[#007AFF]" />
                                    <h2 className="font-bold text-slate-900 text-sm">
                                        {initialLetter ? `Editing ${initialLetter.bureau} Draft` : 'Live Editor'}
                                    </h2>
                                    {selectedIds.size > 0 && <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{selectedIds.size} Items</span>}
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                {mode === 'standard' && (
                                    <button onClick={handleRegenerate} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors" title="Regenerate">
                                        <RefreshCw size={16} />
                                    </button>
                                )}
                                <button onClick={insertClientHeader} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors" title="Insert Client Header">
                                    <User size={16} />
                                </button>
                                <div className="relative">
                                    <button onClick={() => setIsBureauMenuOpen(!isBureauMenuOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors" title="Insert Bureau Address">
                                        <MapPin size={16} />
                                    </button>
                                    {isBureauMenuOpen && (
                                        <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-1 z-50 w-32 flex flex-col gap-1">
                                            {['Experian', 'Equifax', 'TransUnion'].map(b => (
                                                <button key={b} onClick={() => insertBureauAddress(b)} className="text-left px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg">
                                                    {b}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                <button onClick={handleCopy} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors" title="Copy">
                                    <Copy size={16} />
                                </button>
                                <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-purple-600 transition-colors" title={isFullscreen ? "Exit Zen Mode" : "Zen Mode"}>
                                    {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                                </button>
                                
                                <button 
                                    onClick={toggleStatus} 
                                    className={`ml-1 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm transition-all ${letterStatus === 'Sent' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                                >
                                    {letterStatus === 'Sent' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                    {letterStatus}
                                </button>

                                <button 
                                    onClick={handleDownloadPackage}
                                    disabled={isSaving || isDownloading}
                                    className="ml-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold hover:bg-slate-800 flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDownloading || isSaving ? (
                                        <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                        <Download size={12} />
                                    )}
                                    <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Formatting Toolbar */}
                        <div className="px-4 py-2 bg-slate-50/50 flex flex-wrap gap-1 items-center overflow-x-auto">
                            <button onClick={() => execCmd('undo')} className="p-1.5 rounded hover:bg-slate-200 text-slate-500" title="Undo"><Undo size={14} /></button>
                            <button onClick={() => execCmd('redo')} className="p-1.5 rounded hover:bg-slate-200 text-slate-500" title="Redo"><Redo size={14} /></button>
                            <div className="w-px h-4 bg-slate-300 mx-2"></div>
                            
                            <select onChange={(e) => execCmd('fontName', e.target.value)} className="text-[10px] font-bold text-slate-600 bg-transparent border border-slate-200 rounded p-1 outline-none w-24">
                                <option value="ui-sans-serif">Sans Serif</option>
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Arial">Arial</option>
                                <option value="Courier New">Courier</option>
                            </select>
                            <select onChange={(e) => execCmd('fontSize', e.target.value)} className="text-[10px] font-bold text-slate-600 bg-transparent border border-slate-200 rounded p-1 outline-none w-16">
                                <option value="3">Normal</option>
                                <option value="1">Small</option>
                                <option value="5">Large</option>
                                <option value="7">Huge</option>
                            </select>
                            
                            <div className="w-px h-4 bg-slate-300 mx-2"></div>
                            <button onClick={() => execCmd('bold')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 font-bold" title="Bold"><Bold size={14} /></button>
                            <button onClick={() => execCmd('italic')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Italic"><Italic size={14} /></button>
                            <button onClick={() => execCmd('underline')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Underline"><Underline size={14} /></button>
                            
                            <div className="w-px h-4 bg-slate-300 mx-2"></div>
                            <button onClick={() => execCmd('justifyLeft')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Left"><AlignLeft size={14} /></button>
                            <button onClick={() => execCmd('justifyCenter')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Center"><AlignCenter size={14} /></button>
                            <button onClick={() => execCmd('justifyRight')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Right"><AlignRight size={14} /></button>
                            <button onClick={() => execCmd('justifyFull')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Justify"><AlignJustify size={14} /></button>
                        </div>
                    </div>

                    {/* EDITABLE CONTENT */}
                    <div className="flex-1 relative bg-white overflow-hidden flex flex-col">
                        {!letterBody && !isGenerating && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 pointer-events-none">
                                <Wand2 size={48} className="text-slate-300 mb-4" />
                                <p className="text-sm font-bold text-slate-400">Select items to begin drafting</p>
                            </div>
                        )}
                        
                        {isGenerating && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-20 backdrop-blur-sm">
                                <Loader2 size={48} className="text-[#007AFF] animate-spin mb-4" />
                                <p className="text-sm font-bold text-slate-600">Drafting Legal Strategy...</p>
                            </div>
                        )}

                        <div 
                            ref={editorRef}
                            contentEditable
                            className="flex-1 w-full h-full p-12 font-serif text-slate-900 text-[15px] leading-relaxed focus:outline-none custom-scrollbar overflow-y-auto"
                            spellCheck={true}
                            onInput={(e) => setLetterBody(e.currentTarget.innerHTML)}
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* RIGHT SIDEBAR: PROOF & ATTACHMENTS */}
        <AttachmentSidebar 
            clientId={client.id}
            attachedDocs={attachedProofs}
            onAttach={handleAttachDocument}
            onDetach={handleDetachDocument}
        />

    </div>
  );
};