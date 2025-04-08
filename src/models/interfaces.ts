import { TransactionType, TransactionStatus } from '@prisma/client';

// Interface for creating a new account
export interface CreateAccountInput {
  name: string;
  description?: string;
}

// Interface for creating a transaction
export interface CreateLightningTransactionInput {
  accountId: string;
  rHash: string;
  amount: string;
  type: TransactionType;
  status?: TransactionStatus;
  memo?: string;
}

// Interface for transaction summary
export interface TransactionSummary {
  id: string;
  accountId: string;
  rHash: string;
  amount: string;
  type: TransactionType;
  status: TransactionStatus;
  memo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for account summary
export interface AccountSummary {
  id: string;
  name: string;
  description?: string | null;
  balance: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for parsed Lightning invoice
export interface ParsedInvoice {
  paymentRequest: string;
  rHash: string;
  amount: string;
  memo?: string;
  userIdentifier?: string;
  expiry: number;
  timestamp: number;
  rawData: string;
} 