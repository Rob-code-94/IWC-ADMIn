import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Client } from '@/types';
import { db } from '@/services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';

export const QuickChatFloating: React.FC<{ client: Client }> = ({ client }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !client.id) return;
    const q = query(collection(db, 'clients', client.id, 'support_chat'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      // Auto scroll to bottom
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [isOpen, client.id]);

  const handleSend = async () => {
    if (!text.trim()) return;
    try {
      await addDoc(collection(db, 'clients', client.id, 'support_chat'), {
        text: text.trim(),
        sender: 'admin',
        timestamp: serverTimestamp(),
        read: false
      });
      await updateDoc(doc(db, 'clients', client.id), {
        lastMessage: text.trim(),
        lastMessageTimestamp: serverTimestamp()
      });
      setText('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="absolute bottom-6 left-6 z-50 flex flex-col items-start gap-4">
      {isOpen && (
        <LiquidGlassCard className="w-80 h-96 !p-0 flex flex-col bg-white/90 shadow-2xl animate-fade-in-up border border-blue-100 backdrop-blur-xl">
          <div className="p-3 bg-slate-100/50 border-b border-slate-200 flex justify-between items-center rounded-t-[2.5rem]">
             <div className="flex items-center gap-2 pl-2">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
               <span className="text-xs font-bold text-slate-700">{client.firstName} {client.lastName}</span>
             </div>
             <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-slate-200/50 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-slate-50/30">
             {messages.length === 0 && (
                 <div className="text-center text-[10px] text-slate-400 pt-10 font-medium">No messages yet</div>
             )}
             {messages.map(msg => (
               <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-[11px] font-medium leading-relaxed shadow-sm
                    ${msg.sender === 'admin' 
                        ? 'bg-[#007AFF] text-white rounded-tr-none' 
                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}
                 `}>
                   {msg.text}
                 </div>
               </div>
             ))}
             <div ref={bottomRef} />
          </div>
          <div className="p-2 border-t border-slate-200 bg-white/80 rounded-b-[2.5rem] flex gap-2 items-center">
             <input 
               className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 placeholder:text-slate-400"
               placeholder="Type a message..."
               value={text}
               onChange={e => setText(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && handleSend()}
             />
             <button 
                onClick={handleSend}
                disabled={!text.trim()} 
                className="p-2.5 bg-[#007AFF] text-white rounded-full hover:bg-blue-600 active:scale-95 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
             >
                 <Send size={14} fill="currentColor" />
             </button>
          </div>
        </LiquidGlassCard>
      )}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-xl shadow-slate-900/10 flex items-center justify-center transition-all hover:scale-110 active:scale-95 border border-white/20
          ${isOpen ? 'bg-white text-slate-600' : 'bg-slate-900 text-white'}
        `}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={26} strokeWidth={2.5} />}
      </button>
    </div>
  );
};