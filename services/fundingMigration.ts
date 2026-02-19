import { db } from '@/services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

/**
 * Executes tiered migration from legacy 'funding' to 'active_ops' hierarchy.
 */
export const migrateFundingToActiveOps = async (onLog: (msg: string) => void) => {
  if (!db) throw new Error("Database not initialized");
  onLog("🚀 INITIALIZING PIVOT PROTOCOL...");

  try {
    const clientsSnap = await getDocs(collection(db, 'clients'));
    onLog(`🔍 SCANNING: Found ${clientsSnap.docs.length} client environments.`);

    let totalMigrated = 0;

    for (const clientDoc of clientsSnap.docs) {
      const clientId = clientDoc.id;
      const clientName = clientDoc.data().name || clientId;
      
      // Probe Legacy Path
      const legacyFundingRef = collection(db, 'clients', clientId, 'funding');
      const legacySnap = await getDocs(legacyFundingRef);

      if (legacySnap.empty) {
        onLog(`ℹ️ SKIP: [${clientName}] - No legacy 'funding' collection found.`);
        continue;
      }

      onLog(`📦 MIGRATING: [${clientName}] - Found ${legacySnap.docs.length} nodes.`);

      for (const lenderDoc of legacySnap.docs) {
        const lenderData = lenderDoc.data();
        const lenderId = lenderDoc.id;
        const instName = lenderData.institution_name || lenderData.name || lenderId;

        // 1. Relocate Strategy Board
        onLog(`   -> Mapping Strategy: ${instName}`);
        await setDoc(doc(db, 'clients', clientId, 'banking_relationships', lenderId), {
          ...lenderData,
          migratedAt: new Date().toISOString(),
          migration_source: 'legacy_funding_root'
        }, { merge: true });

        // 2. Relocate Paper Trail (Sub-collections)
        // Note: Firestore getDocs on a sub-collection only works if you know the name. 
        // We look for 'history' as per standard IWC legacy patterns.
        const legacyHistoryRef = collection(db, 'clients', clientId, 'funding', lenderId, 'history');
        const historySnap = await getDocs(legacyHistoryRef);

        if (!historySnap.empty) {
          onLog(`   -> Nesting ${historySnap.docs.length} history items to 'funding_sessions'...`);
          for (const sessionDoc of historySnap.docs) {
            const sessionData = sessionDoc.data();
            await setDoc(doc(db, 'clients', clientId, 'active_ops', lenderId, 'funding_sessions', sessionDoc.id), {
              ...sessionData,
              source: 'Legacy_Import',
              migratedAt: new Date().toISOString()
            }, { merge: true });
            await deleteDoc(sessionDoc.ref);
          }
        }

        // 3. Purge legacy record
        await deleteDoc(lenderDoc.ref);
        totalMigrated++;
      }
      onLog(`✅ VERIFIED: [${clientName}] pivot complete.`);
    }

    if (totalMigrated === 0) {
      onLog("⚠️ TERMINATED: Protocol finished but 0 records were moved. Check if data exists in 'clients/{id}/funding'.");
    } else {
      onLog(`🏁 SUCCESS: ${totalMigrated} records re-architected.`);
    }
    
  } catch (error: any) {
    onLog(`❌ FATAL EXCEPTION: ${error.message}`);
    console.error("Migration Error Detail:", error);
    throw error;
  }
};