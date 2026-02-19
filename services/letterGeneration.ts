import { functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

interface GenerateLetterPayload {
  clientId: string;
  targetBureau: string;
  reportDate: string;
  disputeRound: string;
  additionalContext: string;
  selectedAccounts: any[];
}

interface GenerateLetterResponse {
  evidenceGuide: string;
  letterBody: string;
}

export const generateDisputeDraft = async (
  clientId: string, 
  bureau: string, 
  items: any[], 
  context: string,
  reportDate: string,
  disputeRound: string = "1"
): Promise<GenerateLetterResponse> => {
  const draftFn = httpsCallable<GenerateLetterPayload, GenerateLetterResponse>(functions, 'draftLetter');
  
  try {
    const result = await draftFn({
      clientId,
      targetBureau: bureau,
      reportDate,
      disputeRound,
      additionalContext: context,
      selectedAccounts: items
    });
    return result.data;
  } catch (error) {
    console.error("Letter Generation Failed:", error);
    throw error;
  }
};