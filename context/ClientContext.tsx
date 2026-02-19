import React, { createContext, useContext, useState, useEffect } from 'react';
import { Client } from '@/types';
import { db, subscribeToClients, updateClient, deleteClient, batchDeleteClients } from '@/services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface ClientContextType {
  clients: Client[];
  loading: boolean;
  error: string | null;
  addClientTask: (clientId: string, task: { title: string; category: string }) => Promise<void>;
  updateClientData: (clientId: string, data: Partial<Client>) => Promise<void>;
  deleteClientData: (clientId: string) => Promise<void>;
  bulkDeleteClientsData: (clientIds: string[]) => Promise<void>;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use the centralized subscription service to ensure data consistency
    const unsubscribe = subscribeToClients((updatedClients) => {
        try {
            // Sort pinned clients first, then alphabetical
            const sortedClients = updatedClients.sort((a, b) => {
                if (a.isPinned === b.isPinned) {
                    const nameA = a.firstName || '';
                    const nameB = b.firstName || '';
                    return nameA.localeCompare(nameB);
                }
                return a.isPinned ? -1 : 1;
            });
            setClients(sortedClients);
            setLoading(false);
        } catch (err) {
            console.error("Error processing client data:", err);
            setError("Failed to process data");
            setLoading(false);
        }
    });

    return () => unsubscribe();
  }, []);

  const addClientTask = async (clientId: string, task: { title: string; category: string }) => {
    try {
        await addDoc(collection(db, 'clients', clientId, 'tasks'), {
            title: task.title,
            category: task.category,
            status: 'Pending',
            createdAt: serverTimestamp(),
            createdBy: 'Admin Console'
        });
    } catch (err) {
        console.error("Error adding task:", err);
        throw err;
    }
  };

  const updateClientData = async (clientId: string, data: Partial<Client>) => {
    try {
      await updateClient(clientId, data);
    } catch (err) {
      console.error("Error updating client:", err);
      throw err;
    }
  };

  const deleteClientData = async (clientId: string) => {
    try {
      await deleteClient(clientId);
    } catch (err) {
      console.error("Error deleting client:", err);
      throw err;
    }
  };

  const bulkDeleteClientsData = async (clientIds: string[]) => {
    try {
      await batchDeleteClients(clientIds);
    } catch (err) {
      console.error("Error batch deleting clients:", err);
      throw err;
    }
  };

  return (
    <ClientContext.Provider value={{ 
      clients, 
      loading, 
      error, 
      addClientTask, 
      updateClientData, 
      deleteClientData, 
      bulkDeleteClientsData 
    }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClients = () => {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClients must be used within a ClientProvider');
  }
  return context;
};