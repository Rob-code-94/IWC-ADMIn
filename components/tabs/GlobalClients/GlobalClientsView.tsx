import React, { useState, useEffect } from 'react';
import { ClientSelectionView } from './ClientSelectionView';
import { ClientProfileView } from './ClientProfileView';
import { useClients } from '@/context/ClientContext';
import { Client } from '@/types';
import { AddClientModal } from './AddClientModal';

interface GlobalClientsViewProps {
    onOpenWorkspace: (client: Client) => void;
}

export const GlobalClientsView: React.FC<GlobalClientsViewProps> = ({ onOpenWorkspace }) => {
    const { clients, loading } = useClients();
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Select first client by default when loaded
    useEffect(() => {
        if (!selectedClientId && clients.length > 0) {
            setSelectedClientId(clients[0].id);
        }
    }, [clients, selectedClientId]);

    const selectedClient = clients.find(c => c.id === selectedClientId) || null;

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <div className="animate-pulse text-slate-400 font-bold text-lg">Loading directory...</div>
        </div>
    );

    return (
        <div className="flex h-full gap-8 overflow-hidden pl-2 relative">
            {/* Modal Overlay */}
            <AddClientModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
            />

            <ClientSelectionView
                clients={clients}
                selectedClientId={selectedClientId}
                onSelectClient={setSelectedClientId}
                onAddClick={() => setIsAddModalOpen(true)}
            />
            {selectedClient ? (
                <ClientProfileView
                    client={selectedClient}
                    onOpenWorkspace={onOpenWorkspace}
                />
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">
                    Select a client to view details
                </div>
            )}
        </div>
    );
};