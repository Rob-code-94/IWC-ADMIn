import React, { useState, useEffect } from 'react';
import { Client, LoginCredential } from '@/types';
import { db, subscribeToLogins } from '@/services/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { LoginVaultItem } from './LoginVaultItem';
import { AddLoginModal } from './AddLoginModal';
import { Plus, Shield, ShieldCheck, Key } from 'lucide-react';

interface LoginsViewProps {
  client: Client;
}

export const LoginsView: React.FC<LoginsViewProps> = ({ client }) => {
  const [logins, setLogins] = useState<LoginCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (!client.id) return;
    setLoading(true);
    
    // Use the universal subscription service to ensure "Other" is mapped correctly
    const unsubscribe = subscribeToLogins(client.id, (data) => {
        setLogins(data);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [client.id]);

  const handleUpdate = async (id: string, data: Partial<LoginCredential>) => {
    await updateDoc(doc(db, 'clients', client.id, 'logins', id), data);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this credential?')) {
        await deleteDoc(doc(db, 'clients', client.id, 'logins', id));
    }
  };

  // DYNAMIC GROUPING LOGIC
  // Groups by category automatically, creating new sections for custom or 'Other'
  const groupedLogins = logins.reduce((acc, login) => {
    const category = login.category || 'Other';
    if (!acc[category]) {
        acc[category] = [];
    }
    acc[category].push(login);
    return acc;
  }, {} as Record<string, LoginCredential[]>);

  // Define preferred sort order for categories
  const categoryOrder = ['Credit Monitoring', 'Banking & Finance', 'Utility / Misc', 'Other'];
  
  const sortedCategories = Object.keys(groupedLogins).sort((a, b) => {
      const idxA = categoryOrder.indexOf(a);
      const idxB = categoryOrder.indexOf(b);
      // If both are known categories, sort by predefined order
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      // If only A is known, it comes first
      if (idxA !== -1) return -1;
      // If only B is known, it comes first
      if (idxB !== -1) return 1;
      // Otherwise alphabetical
      return a.localeCompare(b);
  });

  return (
    <div className="flex h-full gap-8 animate-fade-in">
      <AddLoginModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        clientId={client.id} 
      />

      {/* LEFT COLUMN: Vault List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10 space-y-8">
         {sortedCategories.map((category) => (
            <div key={category} className="space-y-4">
                <h2 className="text-sm font-black uppercase text-slate-400 tracking-widest pl-1 sticky top-0 bg-[#F2F2F7]/90 backdrop-blur-sm z-10 py-2">
                    {category}
                </h2>
                <div className="grid grid-cols-1 gap-4">
                    {groupedLogins[category].map(cred => (
                        <LoginVaultItem 
                            key={cred.id} 
                            credential={cred} 
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            </div>
         ))}
         
         {logins.length === 0 && !loading && (
             <div className="flex flex-col items-center justify-center h-64 text-center opacity-60">
                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <Shield size={32} />
                </div>
                <p className="text-lg font-bold text-slate-600">Vault is Empty</p>
                <p className="text-sm text-slate-500">Securely store client credentials here.</p>
             </div>
         )}
      </div>

      {/* RIGHT COLUMN: Security Sidebar (Fixed 320px) */}
      <div className="w-[320px] flex-shrink-0 flex flex-col gap-6">
         {/* Action Card */}
         <LiquidGlassCard className="bg-gradient-to-br from-[#007AFF] to-blue-600 border-none text-white">
            <h3 className="font-bold text-lg mb-2">Security Vault</h3>
            <p className="text-blue-100 text-xs mb-6 leading-relaxed">
                Store encrypted credentials for quick access during restoration.
            </p>
            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="w-full py-3 bg-white text-blue-600 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
                <Plus size={18} /> Add New Login
            </button>
         </LiquidGlassCard>

         {/* Stats */}
         <LiquidGlassCard className="flex flex-col gap-4">
             <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                 <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><ShieldCheck size={20} /></div>
                 <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase">Total Logins</p>
                     <p className="text-xl font-bold text-slate-900">{logins.length}</p>
                 </div>
             </div>
             <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                 <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Key size={20} /></div>
                 <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase">Monitoring</p>
                     <p className="text-xl font-bold text-slate-900">
                        {logins.filter(l => l.category === 'Credit Monitoring').length}
                     </p>
                 </div>
             </div>
         </LiquidGlassCard>

         {/* Instructions */}
         <div className="p-4 rounded-3xl border border-slate-200/60 bg-white/40 text-xs text-slate-500 leading-relaxed">
            <p className="font-bold text-slate-700 mb-2">Protocol:</p>
            <ul className="list-disc pl-4 space-y-1">
                <li>Always verify 2FA settings with client.</li>
                <li>Update notes with security questions.</li>
                <li>Credentials are encrypted at rest.</li>
            </ul>
         </div>
      </div>
    </div>
  );
};