import React, { useState } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { X, Search } from 'lucide-react';
import { useClients } from '@/context/ClientContext';

interface NewMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (clientId: string) => void;
}

export const NewMessageModal: React.FC<NewMessageModalProps> = ({ isOpen, onClose, onSelect }) => {
    const { clients } = useClients();
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const filteredClients = clients.filter(client => {
        const full = (client.name || `${client.firstName} ${client.lastName}`).toLowerCase();
        return full.includes(searchTerm.toLowerCase()) || client.email.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             {/* Backdrop */}
             <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
             
             {/* Modal Content */}
             <LiquidGlassCard className="w-full max-w-md relative z-10 !p-0 overflow-hidden flex flex-col max-h-[80vh] shadow-2xl animate-fade-in-up">
                <div className="p-4 border-b border-white/40 flex justify-between items-center bg-white/50 backdrop-blur-md">
                    <h3 className="font-bold text-slate-900 text-lg">New Message</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                        <X size={18} className="text-slate-600" />
                    </button>
                </div>

                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            autoFocus
                            type="text"
                            placeholder="To: Search clients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm border border-slate-200/50"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-white/40">
                    {filteredClients.map(client => (
                        <button
                            key={client.id}
                            onClick={() => {
                                onSelect(client.id);
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-xl transition-colors group text-left"
                        >
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs group-hover:bg-blue-200 group-hover:text-blue-700 flex-shrink-0">
                                {client.firstName[0]}{client.lastName[0]}
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-slate-900 text-sm truncate">
                                    {client.name || `${client.firstName} ${client.lastName}`}
                                </p>
                                <p className="text-xs text-slate-500 truncate">{client.email}</p>
                            </div>
                        </button>
                    ))}
                    {filteredClients.length === 0 && (
                        <div className="text-center py-12 text-slate-400 text-sm">
                            <p>No clients found matching "{searchTerm}"</p>
                        </div>
                    )}
                </div>
             </LiquidGlassCard>
        </div>
    );
};