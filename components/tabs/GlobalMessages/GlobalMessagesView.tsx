import React, { useState, useEffect } from 'react';
import { ConversationList } from './Sidebar/ConversationList';
import { MessageThread } from './Thread/MessageThread';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { useClients } from '@/context/ClientContext';
import { MessageSquare } from 'lucide-react';

interface GlobalMessagesViewProps {
    unreadClientIds?: string[];
}

export const GlobalMessagesView: React.FC<GlobalMessagesViewProps> = ({ unreadClientIds = [] }) => {
  const { clients } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Auto-select first client with unread message if available, else first list item
  useEffect(() => {
    if (!selectedClientId && clients.length > 0) {
        // Priority 1: Unread
        const unreadId = unreadClientIds.find(id => clients.some(c => c.id === id));
        if (unreadId) {
            setSelectedClientId(unreadId);
            return;
        }

        // Priority 2: With History
        const withMessages = clients.find(c => c.lastMessageTimestamp);
        setSelectedClientId(withMessages ? withMessages.id : clients[0].id);
    }
  }, [clients, selectedClientId, unreadClientIds]);

  const activeClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="flex h-full gap-6 overflow-hidden pl-2">
      {/* Left Sidebar */}
      <ConversationList 
        selectedClientId={selectedClientId} 
        onSelectClient={setSelectedClientId} 
        unreadClientIds={unreadClientIds}
      />

      {/* Right Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden pr-2 pt-2 pb-2">
        {activeClient ? (
            <MessageThread client={activeClient} />
        ) : (
            <div className="h-full w-full flex items-center justify-center">
                <LiquidGlassCard className="text-center p-12">
                    <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                        <MessageSquare className="text-slate-300" size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">No Client Selected</h3>
                    <p className="text-slate-500 mt-2">Select a conversation from the sidebar.</p>
                </LiquidGlassCard>
            </div>
        )}
      </div>
    </div>
  );
};