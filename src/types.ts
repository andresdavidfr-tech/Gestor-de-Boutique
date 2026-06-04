import { Timestamp } from 'firebase/firestore';

export type BagStatus = 'available' | 'concession' | 'sold' | 'returned';
export type VisitStatus = 'scheduled' | 'completed' | 'cancelled';
export type TransactionType = 'sold' | 'paid' | 'debt';
export type ContactPreference = 'whatsapp' | 'email';

export interface Bag {
  id: string;
  brand: string;
  model?: string;
  serialNumber?: string;
  grading?: string;
  conditionDetails?: string;
  status: BagStatus;
  price?: number;
  cost?: number;
  ownerId?: string;
  notes?: string;
  photoUrl?: string;
  entryDate?: string;
  createdAt?: Timestamp;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  balance?: number;
  notes?: string;
  categories?: string[];
  brands?: string[];
  personalStyle?: string;
  wishlist?: string;
  birthday?: string;
  contactPreference?: ContactPreference;
  photoUrl?: string;
  createdAt?: Timestamp;
}

export interface Visit {
  id: string;
  clientId: string;
  date?: Timestamp | string;
  status: VisitStatus;
  purpose?: string;
  notes?: string;
}

export interface Transaction {
  id: string;
  clientId: string;
  amount: number;
  type: TransactionType;
  notes?: string;
  date?: Timestamp;
  updatedAt?: Timestamp;
}

export interface HistoryEntry {
  id: string;
  userId?: string;
  userEmail?: string;
  action?: string;
  details?: Record<string, any>;
  timestamp?: Timestamp;
}
