import React, { useState } from 'react';
import { Send, Mic, Paperclip } from 'lucide-react';
import { db } from '@/services/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

interface MessageInputProps {
  clientId: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({ clientId }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    
    setSending(true);
    try {
        // 1. Write Message to Sub-collection
        await addDoc(collection(db, 'clients', clientId, 'support_chat'), {
            text: text.trim(),
            sender: 'admin', // Strict lowercase
            timestamp: serverTimestamp(),
            read: false,
        });

        // 2. Update Parent Client Metadata for Inbox Sync
        await updateDoc(doc(db, 'clients', clientId), {
            lastMessage: text.trim(),
            lastMessageTimestamp: serverTimestamp()
        });

        setText('');
    } catch (err) {
        console.error("Error sending message:", err);
    } finally {
        setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  return (
    <div className="p-4 bg-white/60 backdrop-blur-xl border-t border-white/40">
        <div className="relative max-w-4xl mx-auto">
             <div className="absolute left-4 top-4 flex gap-2">
                 <button className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                     <Paperclip size={20} />
                 </button>
             </div>
             
             <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your reply..."
                rows={3}
                className="w-full bg-white border border-slate-200 rounded-[2rem] pl-16 pr-32 py-4 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all resize-none shadow-sm"
             />

             <div className="absolute right-3 top-3 flex items-center gap-2">
                 <button className="p-3 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Voice Dictation">
                     <Mic size={20} />
                 </button>
                 <button 
                    onClick={handleSend}
                    disabled={!text.trim() || sending}
                    className="p-3 bg-[#007AFF] text-white rounded-full shadow-lg shadow-blue-500/30 hover:bg-blue-600 active:scale-90 transition-all disabled:opacity-50 disabled:shadow-none"
                 >
                     <Send size={20} fill="currentColor" />
                 </button>
             </div>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
            Press Enter to send • Shift + Enter for new line
        </p>
    </div>
  );
};