import { functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

interface ForensicPayload {
  clientId: string;
  selectedAccounts: any[]; // Accepts array of clean account objects
}

export const runForensicAudit = async (clientId: string, items: any[]) => {
  const auditFlow = httpsCallable<ForensicPayload, any>(functions, 'forensicAudit');
  
  const payload: ForensicPayload = {
    clientId,
    selectedAccounts: items
  };

  try {
    const result = await auditFlow(payload);
    return result.data;
  } catch (error) {
    console.error("Forensic Audit Handshake Failed:", error);
    throw error;
  }
};