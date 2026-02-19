
export type Page =
| 'global-dashboard' | 'global-clients' | 'global-messages'
| 'global-tasks' | 'global-resources' | 'global-billing'
| 'global-vault' | 'global-settings';

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  name?: string; // Full name from Firestore
  email: string;
  phone: string;
  password?: string; // Admin managed password
  address?: string;
  dob?: string;
  ssn?: string;
  isPinned?: boolean;
  status: 'Active' | 'Lead' | 'Onboarding' | 'Dispute' | 'Archived';
  scores?: { experian: number | null; transUnion: number | null; equifax: number | null; };
  // Messaging Metadata
  lastMessage?: string;
  lastMessageTimestamp?: any; // Firestore Timestamp
  // Operational Dates
  consultingDueDate?: string;
  disputeDueDate?: string;
}

export type WorkspaceTab = 'dashboard' | 'restoration' | 'funding' | 'vault';

export interface LoginCredential {
  id: string;
  serviceName: string;
  username: string;
  password: string;
  websiteUrl?: string;
  category: 'Credit Monitoring' | 'Banking & Finance' | 'Utility / Misc' | 'Other';
  notes?: string;
  updatedAt?: any;
}

export interface ClientTask {
  id: string;
  title: string;
  status: 'Todo' | 'In Progress' | 'Complete';
  priority: 'High' | 'Medium' | 'Low';
  category: 'Restoration' | 'Funding' | 'Onboarding' | 'General';
  websiteLink?: string;
  dueDate?: any; // Timestamp or string
  createdAt?: any;
}

export interface ClientDocument {
  id: string;
  name: string;
  type: 'ID' | 'Utility' | 'SSN' | 'Report' | 'Contract' | 'Other';
  category: 'Consulting' | 'Restoration' | 'Funding' | 'Other';
  url?: string;
  uploadedAt?: any;
  size?: string;
}

export interface ClientNote {
  id: string;
  title?: string;
  content: string;
  createdAt: any;
  createdBy?: string;
  tags?: string[];
}

// --- RESTORATION / REPORT TYPES ---

export interface BureauData {
  overallStatus: 'Positive' | 'Negative';
  accountStatus: string;
  balance: number;
  creditLimit: string;
  monthlyPayment: string;
  lastReported: string;
  disputeStatus?: string;
  paymentHistory?: string;
  key4Part?: string;
  consultantNote?: string;
}

export interface MergedAccount {
  rowId: string;
  creditorName: string;
  accountNumber: string;
  accountType: string;
  dateOpened: string;
  dateClosed: string;
  experian?: BureauData;
  equifax?: BureauData;
  transunion?: BureauData;
  iwcKey?: string;
  analysisRan?: boolean; // Marker for previously audited items
}

export interface AnalysisReport {
  id: string;
  reportDate: string;
  status: string;
  fileName?: string;
  reportUrl?: string;
  scores: { bureau: string; score: number }[];
  mergedAccounts: MergedAccount[];
  inquiries?: any[];
}