import React, { useState, useEffect } from 'react';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { CreditCard, TrendingUp, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { Client, MergedAccount, BureauData } from '@/types';
import { db } from '@/services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const PortfolioTab: React.FC<{ client: Client }> = ({ client }) => {
  const [portfolioItems, setPortfolioItems] = useState<MergedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client.id) return;
    
    const unsub = onSnapshot(doc(db, 'clients', client.id, 'reports', 'latest_analysis'), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const accounts = (data.mergedAccounts || []) as MergedAccount[];

            /**
             * COMPOSITE FINGERPRINT: Links entries by shared Account Numbers and Open Dates
             */
            const getIdentity = (acc: MergedAccount) => {
                const digits = (acc.accountNumber || '').replace(/[^0-9]/g, '');
                const last4 = digits.length >= 4 ? digits.slice(-4) : 'XXXX';
                
                let dateKey = 'unknown';
                if (acc.dateOpened && acc.dateOpened !== 'Not Provided') {
                    // Match MM/YYYY format to merge "11/21/2025" with "11/2025"
                    const match = acc.dateOpened.match(/(\d{1,2}).*?(\d{4})/);
                    if (match) dateKey = `${match[1].padStart(2, '0')}_${match[2]}`;
                    else dateKey = acc.dateOpened;
                }
                
                // If no account digits, fallback to a name-date key
                if (last4 === 'XXXX') {
                    const name = (acc.creditorName || 'Unknown').split(/[\s/]/)[0].toLowerCase().replace(/[^a-z]/g, '');
                    return `name_${name}_${dateKey}`;
                }
                return `acct_${last4}_${dateKey}`;
            };

            // 1. PASS 1: Identify "Forbidden" Identities (Blacklist anything Negative or Closed)
            const forbiddenIdentities = new Set<string>();
            accounts.forEach(acc => {
                const id = getIdentity(acc);
                const bureaus = [acc.experian, acc.equifax, acc.transunion].filter(b => !!b) as BureauData[];
                
                const isClosedByDate = acc.dateClosed && acc.dateClosed !== 'Not Provided' && acc.dateClosed.trim() !== '';
                
                // Check for Negative status OR Closed/Charged indicators in account status text
                const hasNegativeOrClosedStatus = bureaus.some(b => {
                    const statusText = (b.accountStatus || '').toLowerCase();
                    return b.overallStatus === 'Negative' || 
                           statusText.includes('closed') || 
                           statusText.includes('paid') || 
                           statusText.includes('charged') || 
                           statusText.includes('collection');
                });

                // Also exclude Hard Inquiries from Portfolio Assets
                if (isClosedByDate || hasNegativeOrClosedStatus || acc.accountType === 'Hard Inquiry') {
                    forbiddenIdentities.add(id);
                }
            });

            // 2. PASS 2: Aggregate Primary Assets
            const uniqueAssetsMap = new Map<string, MergedAccount>();
            
            accounts.forEach(acc => {
                const id = getIdentity(acc);
                if (forbiddenIdentities.has(id)) return; // Strictly skip blacklisted IDs

                const bureaus = [acc.experian, acc.equifax, acc.transunion].filter(b => !!b) as BureauData[];
                
                // Must have at least one bureau reporting and all reporting bureaus must be Positive
                if (bureaus.length === 0) return;
                const allPositive = bureaus.every(b => b.overallStatus === 'Positive');

                if (allPositive) {
                    // Merge duplicates: If this ID is already in the map, first one wins (usually has most data)
                    if (!uniqueAssetsMap.has(id)) {
                        uniqueAssetsMap.set(id, acc);
                    }
                }
            });
            
            setPortfolioItems(Array.from(uniqueAssetsMap.values()));
        } else {
            setPortfolioItems([]);
        }
        setLoading(false);
    });

    return () => unsub();
  }, [client.id]);

  const getAssetMetrics = (acc: MergedAccount) => {
      const bureaus = [acc.experian, acc.equifax, acc.transunion].filter(b => !!b) as BureauData[];
      
      // Calculate max balance across bureaus
      const maxBalance = Math.max(...bureaus.map(b => {
          if (typeof b.balance === 'number') return b.balance;
          return parseFloat(String(b.balance).replace(/[^0-9.]/g, '')) || 0;
      }), 0);
      
      // Calculate max limit across bureaus
      const maxLimit = Math.max(...bureaus.map(b => {
          if (typeof b.creditLimit === 'number') return b.creditLimit; // Handle if stored as number
          return parseInt(String(b.creditLimit || '0').replace(/[^0-9]/g, '')) || 0;
      }), 0);
      
      const utilization = maxLimit > 0 ? (maxBalance / maxLimit) * 100 : 0;

      return { maxBalance, maxLimit, utilization };
  };

  const getLastReported = (acc: MergedAccount) => {
      const dates = [
          acc.experian?.lastReported, 
          acc.equifax?.lastReported, 
          acc.transunion?.lastReported
      ].filter(d => d && d !== 'Not Provided' && d.trim() !== '');
      
      return dates[0] || 'Unknown';
  };

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-64 opacity-50">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Auditing Active Assets...</p>
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <section>
        <div className="flex items-center gap-2 mb-6 px-2">
            <div className="p-2 bg-blue-100 rounded-lg text-[#007AFF]">
                <CreditCard size={18} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Primary Portfolio Assets</h3>
            <span className="text-[10px] font-black bg-[#007AFF] px-2.5 py-1 rounded-full text-white shadow-sm ml-2">
                {portfolioItems.length} ACTIVE POSITIVE
            </span>
        </div>
        
        {portfolioItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 bg-white/40 rounded-[2.5rem] border border-dashed border-slate-200">
                <AlertCircle className="text-slate-300 mb-2" size={32} />
                <p className="text-slate-500 font-bold">No Open/Positive Assets Identified</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {portfolioItems.map(asset => {
                    const { maxBalance, maxLimit, utilization } = getAssetMetrics(asset);
                    const lastReported = getLastReported(asset);
                    
                    // Utilization Color Logic
                    let utilColor = 'bg-emerald-500';
                    let textColor = 'text-emerald-600';
                    if (utilization > 29) {
                        utilColor = 'bg-orange-500';
                        textColor = 'text-orange-500';
                    } else if (utilization > 9) {
                        utilColor = 'bg-blue-500';
                        textColor = 'text-blue-600';
                    }
                    
                    return (
                        <LiquidGlassCard key={asset.rowId} className="relative overflow-hidden group hover:scale-[1.02] transition-transform border-white/60">
                            <div className="flex justify-between items-start mb-6">
                                <div className="min-w-0 pr-2">
                                    <h4 className="font-black text-slate-900 truncate text-base uppercase leading-tight">{asset.creditorName}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{asset.accountType}</span>
                                        <span className="text-[10px] font-bold text-slate-300">•</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{lastReported}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {asset.experian && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="EXP" />}
                                    {asset.equifax && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="EQ" />}
                                    {asset.transunion && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" title="TU" />}
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Balance</p>
                                        <p className="text-2xl font-black text-slate-900 tracking-tighter">${maxBalance.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Limit</p>
                                        <p className="text-sm font-bold text-slate-600">{maxLimit > 0 ? `$${maxLimit.toLocaleString()}` : 'NPSL'}</p>
                                    </div>
                                </div>

                                {maxLimit > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-black">
                                            <span className="text-slate-400 uppercase tracking-widest">Utilization</span>
                                            <span className={textColor}>{utilization.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${utilColor}`} 
                                                style={{ width: `${Math.min(utilization, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </LiquidGlassCard>
                    );
                })}
            </div>
        )}
      </section>

      <section className="pb-12">
        <div className="flex items-center gap-2 mb-4 px-2">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                <ShieldCheck size={18} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 uppercase">Global AU Inventory</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <button className="border-2 border-dashed border-slate-300 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all min-h-[140px]">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2"><TrendingUp size={20} /></div>
                <span className="text-xs font-bold uppercase tracking-widest">Assign Tradeline</span>
            </button>
        </div>
      </section>
    </div>
  );
};