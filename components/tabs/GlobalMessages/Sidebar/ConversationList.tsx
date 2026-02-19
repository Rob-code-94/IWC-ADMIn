import React, { useState } from 'react';
import { useClients } from '@/context/ClientContext';
import { Search, SquarePen } from 'lucide-react';
import { Client } from '@/types';
import { NewMessageModal } from '@/components/modals/NewMessageModal';

interface ConversationListProps {
  selectedClientId: string | null;
  onSelectClient: (id: string) => void;
  unreadClientIds: string[];
}

export const ConversationList: React.FC<ConversationListProps> = ({ selectedClientId, onSelectClient, unreadClientIds }) => {
  const { clients } = useClients();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. FILTER: Only show clients with active message history
  const activeConversations = clients.filter(c => {
     const hasMsg = c.lastMessage && typeof c.lastMessage === 'string' && c.lastMessage.trim().length > 0;
     return hasMsg;
  });

  // 2. SORT: Newest messages first
  activeConversations.sort((a, b) => {
    // Priority sort: Unread first? Maybe. For now stick to time.
    const timeA = a.lastMessageTimestamp?.toMillis ? a.lastMessageTimestamp.toMillis() : 0;
    const timeB = b.lastMessageTimestamp?.toMillis ? b.lastMessageTimestamp.toMillis() : 0;
    return timeB - timeA;
  });

  // 3. DRAFT INJECTION: If selected client has no history (started via Compose), inject them at top
  let displayList = [...activeConversations];
  
  if (selectedClientId) {
      const selectedClient = clients.find(c => c.id === selectedClientId);
      const isAlreadyInList = activeConversations.some(c => c.id === selectedClientId);
      
      if (selectedClient && !isAlreadyInList) {
          // Prepend as a "Draft" conversation
          displayList = [selectedClient, ...displayList];
      }
  }

  // 4. LOCAL SEARCH
  const filteredDisplayList = displayList.filter(c => 
      (c.firstName + ' ' + c.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const today = new Date();
        const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
        
        if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
        return '';
    }
  };

  const renderLastMessage = (client: Client, isUnread: boolean) => {
    if (!client.lastMessage) return <span className="text-blue-500 font-bold italic">New Draft</span>;
    return <span className={isUnread ? "font-bold text-slate-900" : ""}>{client.lastMessage}</span>;
  };

  return (
    <>
    <div className="flex flex-col h-full border-r border-slate-200/60 pr-4 w-full md:w-80 lg:w-96 flex-shrink-0">
      
      {/* Header Area */}
      <div className="mb-6 pl-2 pt-2 pr-2 space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Messages</h2>
            <button 
                onClick={() => setIsComposeOpen(true)}
                className="w-10 h-10 rounded-full bg-slate-200/50 hover:bg-[#007AFF] hover:text-white text-slate-600 flex items-center justify-center transition-all shadow-sm active:scale-95"
                title="Compose New Message"
            >
                <SquarePen size={20} />
            </button>
        </div>
        
        {/* Search Bar */}
        <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
                type="text" 
                placeholder="Search inbox..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-200/50 hover:bg-slate-200/70 focus:bg-white border-none rounded-[1.2rem] py-3 pl-11 pr-4 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all placeholder:text-slate-400"
            />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pl-2 pr-2">
        {filteredDisplayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center opacity-60">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <SquarePen size={24} />
                </div>
                <p className="text-sm font-bold text-slate-500">No active conversations</p>
                <button 
                    onClick={() => setIsComposeOpen(true)}
                    className="mt-2 text-xs font-bold text-blue-500 hover:text-blue-600 hover:underline"
                >
                    Start a new chat
                </button>
            </div>
        ) : (
            filteredDisplayList.map(client => {
                const isActive = selectedClientId === client.id;
                const isUnread = unreadClientIds.includes(client.id);

                return (
                    <button
                        key={client.id}
                        onClick={() => onSelectClient(client.id)}
                        className={`w-full text-left p-4 rounded-[1.5rem] relative transition-all duration-300 group flex gap-3 items-start
                            ${isActive 
                                ? 'bg-white shadow-lg shadow-slate-200/50 scale-[1.02] border border-white/60' 
                                : 'bg-white/30 hover:bg-white text-slate-600 border border-transparent'}
                        `}
                    >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-colors
                                ${isActive ? 'bg-[#007AFF] text-white' : 'bg-slate-100 text-slate-500'}
                            `}>
                                {client.firstName[0]}{client.lastName[0]}
                            </div>
                            {isUnread && (
                                <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 border-2 border-white rounded-full"></div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                                <h4 className={`font-bold text-sm truncate ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                                    {client.firstName} {client.lastName}
                                </h4>
                                {client.lastMessageTimestamp && (
                                    <span className={`text-[10px] font-bold ml-2 whitespace-nowrap ${isUnread ? 'text-blue-600' : 'text-slate-400'}`}>
                                        {formatTime(client.lastMessageTimestamp)}
                                    </span>
                                )}
                            </div>
                            <p className={`text-xs truncate font-medium leading-relaxed
                                ${isActive ? 'text-slate-500' : 'text-slate-400'}
                                ${!client.lastMessage ? 'opacity-100' : ''}
                            `}>
                                {renderLastMessage(client, isUnread)}
                            </p>
                        </div>
                    </button>
                );
            })
        )}
      </div>
    </div>

    {/* Compose Modal */}
    <NewMessageModal 
        isOpen={isComposeOpen} 
        onClose={() => setIsComposeOpen(false)} 
        onSelect={onSelectClient} 
    />
    </>
  );
};