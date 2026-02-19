import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  collection, 
  onSnapshot, 
  query,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  addDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { Client, LoginCredential } from "@/types";

// [VERIFIED CONFIG: IWC ADMIN]
const firebaseConfig = {
  apiKey: "AIzaSyDVyaOkWjKKk5zZiMpvKHIPFKqm5C2GvBw",
  authDomain: "iwc-connect-83b5d.firebaseapp.com",
  projectId: "iwc-connect-83b5d",
  storageBucket: "iwc-connect-83b5d.firebasestorage.app",
  messagingSenderId: "17441408879",
  appId: "1:17441408879:web:52be373353a399f407ca9a",
  measurementId: "G-Z286NS442S"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let dbInstance;
try {
  dbInstance = initializeFirestore(app, { experimentalForceLongPolling: true });
} catch (e) {
  dbInstance = getFirestore(app);
}

export const db = dbInstance;
export const storage = getStorage(app);
export const functions = getFunctions(app);

const normalizeScore = (val: any): number | null => {
  if (typeof val === 'number') return val;
  if (val && typeof val === 'object') {
    if ('fico_score_8' in val) return Number(val.fico_score_8) || null;
    return null;
  }
  return null;
};

export const subscribeToClients = (setClients: (clients: Client[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'clients'));
  return onSnapshot(q, (snapshot) => {
    const clients = snapshot.docs.map(doc => {
      const data = doc.data();
      const fullName = data.name || "";
      const nameParts = fullName.split(" ");
      const rawScores = data.scores || {};
      let safeLastMessage = data.lastMessage;
      if (safeLastMessage && typeof safeLastMessage === 'object') {
          safeLastMessage = safeLastMessage.text || 'Message';
      }

      return {
        id: doc.id,
        ...data,
        firstName: nameParts[0] || "Unknown",
        lastName: nameParts.slice(1).join(" ") || "",
        status: data.status || 'Active',
        lastMessage: safeLastMessage,
        scores: { 
            experian: normalizeScore(rawScores.experian), 
            transUnion: normalizeScore(rawScores.transUnion), 
            equifax: normalizeScore(rawScores.equifax) 
        }
      } as Client;
    });
    setClients(clients);
  });
};

export const subscribeToLogins = (clientId: string, callback: (logins: LoginCredential[]) => void) => {
  if (!db || !clientId) {
      callback([]);
      return () => {};
  }
  const q = query(collection(db, 'clients', clientId, 'logins'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => {
      const loginData = doc.data();
      return { id: doc.id, ...loginData, category: loginData.category || 'Other' } as LoginCredential;
    });
    callback(data);
  });
};

// UNDERWRITING DATA: Single document path -> clients/{id}/funding_profile
export const subscribeToFundingProfile = (clientId: string, callback: (data: any) => void) => {
  if (!db || !clientId) return () => {};
  return onSnapshot(doc(db, 'clients', clientId, 'funding_profile', 'latest'), (doc) => {
    callback(doc.exists() ? doc.data() : null);
  });
};

export const updateFundingProfile = async (clientId: string, data: any) => {
  const ref = doc(db, 'clients', clientId, 'funding_profile', 'latest');
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
};

// READINESS AUDIT: Path -> clients/{id}/funding_config/readiness
export const subscribeToReadiness = (clientId: string, callback: (data: any) => void) => {
  if (!db || !clientId) return () => {};
  return onSnapshot(doc(db, 'clients', clientId, 'funding_config', 'readiness'), (doc) => {
    callback(doc.exists() ? doc.data() : null);
  });
};

export const updateReadinessItem = async (clientId: string, itemId: string, value: boolean) => {
  const ref = doc(db, 'clients', clientId, 'funding_config', 'readiness');
  await setDoc(ref, { [itemId]: value }, { merge: true });
};

export const addClient = async (clientData: Partial<Client>) => {
  try {
    const firstName = clientData.firstName || '';
    const lastName = clientData.lastName || '';
    const fullName = clientData.name || `${firstName} ${lastName}`.trim();

    await addDoc(collection(db, 'clients'), {
      ...clientData,
      name: fullName,
      status: 'Onboarding',
      onboardingComplete: false,
      isPinned: false,
      createdAt: serverTimestamp(),
      scores: { experian: null, transUnion: null, equifax: null }
    });
  } catch (err) {
    console.error("Error adding client:", err);
    throw err;
  }
};

export const updateClient = async (clientId: string, data: Partial<Client>) => {
  const docRef = doc(db, 'clients', clientId);
  const { id, ...updateData } = data as any;
  await updateDoc(docRef, updateData);
};

export const deleteClient = async (clientId: string) => {
  await deleteDoc(doc(db, 'clients', clientId));
};

export const batchDeleteClients = async (clientIds: string[]) => {
  const batch = writeBatch(db);
  clientIds.forEach(id => {
    const docRef = doc(db, 'clients', id);
    batch.delete(docRef);
  });
  await batch.commit();
};

export const updateLetterStatus = async (clientId: string, letterId: string, status: string) => {
  const ref = doc(db, 'clients', clientId, 'letters', letterId);
  await updateDoc(ref, { status });
};

export const updateLetterAttachments = async (clientId: string, letterId: string, attachedProofs: string[]) => {
  const ref = doc(db, 'clients', clientId, 'letters', letterId);
  await updateDoc(ref, { attachedProofs });
};

// --- BANKING & OPS SYNC HELPERS ---

/**
 * Removes a bank from both banking_relationships AND active_ops to ensure no ghost files remain.
 */
export const cascadingBankDelete = async (clientId: string, bankId: string) => {
  const batch = writeBatch(db);
  
  // 1. Delete from Master (Banking)
  const bankRef = doc(db, 'clients', clientId, 'banking_relationships', bankId);
  batch.delete(bankRef);

  // 2. Delete from Mirror (Active Ops)
  const opsRef = doc(db, 'clients', clientId, 'active_ops', bankId);
  batch.delete(opsRef);

  await batch.commit();
};

/**
 * Updates status in banking_relationships and mirrors it to active_ops to ensure consistency.
 * Uses { merge: true } to prevent overwriting other fields.
 */
export const syncBankStatus = async (clientId: string, bankId: string, status: string, bankData: any = {}) => {
  const batch = writeBatch(db);
  
  // 1. Update Banking
  const bankRef = doc(db, 'clients', clientId, 'banking_relationships', bankId);
  batch.set(bankRef, { 
      status, 
      updatedAt: serverTimestamp() 
  }, { merge: true });

  // 2. Sync to Active Ops (Mirroring)
  const opsRef = doc(db, 'clients', clientId, 'active_ops', bankId);
  // We include bankData here to ensure if the ops doc didn't exist (edge case), it's created with enough info.
  // But strictly, we only want to update status if it exists, or create if missing (BluePrint says Double Write on Add).
  batch.set(opsRef, {
      ...bankData, // Fallback data if creating new
      status,
      lastSessionUpdate: serverTimestamp()
  }, { merge: true });

  await batch.commit();
};