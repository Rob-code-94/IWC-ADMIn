import React, { useEffect, useState, useRef } from 'react';
import { Client } from '@/types';
import { db } from '@/services/firebase';
import { collection, query, orderBy, onSnapshot, DocumentData, writeBatch, doc } from 'firebase/firestore';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { MessageInput } from './MessageInput';
import { AlertCircle } from 'lucide-react';

interface MessageThreadProps {
  client: Client;
}

export const MessageThread: React.FC<MessageThreadProps> = ({ client }) => {
  const [messages, setMessages] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!client?.id) return;

    setLoading(true);
    const q = query(
        collection(db, 'clients', client.id, 'support_chat'),
        orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(msgs);
        setLoading(false);
        // Scroll to bottom on new message
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [client.id]);

  // AUTO-READ PROTOCOL
  // Marks messages as read when the thread is loaded/updated
  useEffect(() => {
    if (!messages.length || !client.id) return;

    // Identify unread messages from the client
    const unreadIds = messages
        .filter(m => m.read === false && m.sender !== 'admin')
        .map(m => m.id);

    if (unreadIds.length > 0) {
        const batch = writeBatch(db);
        unreadIds.forEach(id => {
            const ref = doc(db, 'clients', client.id, 'support_chat', id);
            batch.update(ref, { read: true });
        });
        
        batch.commit().catch(e => console.error("Error marking messages read:", e));
    }
  }, [messages, client.id]);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    return timestamp.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const renderWithLinks = (text: string, isAdmin: boolean) => {
    if (!text) return null;
    // Regex for URLs starting with http://, https://, or www.
    const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
        if (part.match(urlRegex)) {
            const href = part.startsWith('www.') ? `http://${part}` : part;
            return (
                <a 
                    key={i} 
                    href={href} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={`underline break-all ${isAdmin ? 'text-white/90 hover:text-white' : 'text-blue-600 hover:text-blue-800'}`}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 backdrop-blur-sm rounded-[2.5rem] border border-white/40 shadow-inner overflow-hidden relative">
      
      {/* Translucent Identity Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/70 backdrop-blur-xl border-b border-white/50 p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                 {client.firstName[0]}{client.lastName[0]}
             </div>
             <div>
                 <h3 className="font-bold text-slate-900">{client.firstName} {client.lastName}</h3>
                 <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full
                    ${client.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}
                 `}>
                     {client.status}
                 </span>
             </div>
        </div>
        <div className="text-right">
             <p className="text-[10px] font-bold text-slate-400 uppercase">Client ID</p>
             <p className="text-xs font-mono text-slate-600">#{client.id.slice(0,6)}</p>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-24 space-y-6">
         {loading ? (
             <div className="flex items-center justify-center h-full">
                 <div className="animate-pulse text-slate-400 font-bold">Loading conversation...</div>
             </div>
         ) : messages.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                 <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-4">
                     <AlertCircle size={32} />
                 </div>
                 <p className="font-bold">No messages yet</p>
                 <p className="text-xs">Start the conversation below.</p>
             </div>
         ) : (
             messages.map((msg) => {
                 const isAdmin = msg.sender === 'admin';
                 return (
                     <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[70%] space-y-1 ${isAdmin ? 'items-end' : 'items-start'} flex flex-col`}>
                             <div className={`p-4 rounded-2xl shadow-sm text-sm font-medium leading-relaxed
                                ${isAdmin 
                                    ? 'bg-[#007AFF] text-white rounded-tr-sm' 
                                    : 'bg-white text-slate-800 rounded-tl-sm border border-slate-100'}
                             `}>
                                 {renderWithLinks(msg.text, isAdmin)}
                             </div>
                             <div className="flex items-center gap-1.5 px-1">
                                <span className="text-[10px] font-bold text-slate-400">
                                    {formatTime(msg.timestamp)}
                                </span>
                                {!isAdmin && !msg.read && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Unread"></span>
                                )}
                             </div>
                         </div>
                     </div>
                 )
             })
         )}
         <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <MessageInput clientId={client.id} />
    </div>
  );
};