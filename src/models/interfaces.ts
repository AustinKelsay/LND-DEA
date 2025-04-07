import { InvoiceState, InvoiceType } from '@prisma/client';

// Interface representing a parsed Bolt11 invoice
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

// Interface for creating a new user
export interface CreateUserInput {
  username: string;
}

// Interface for creating a new account
export interface CreateAccountInput {
  userId: string;
  name: string;
}

// Interface for creating a transaction
export interface CreateTransactionInput {
  amount: string;
  debitAccountId: string;
  creditAccountId: string;
  invoiceId?: string;
  description?: string;
}

// Interface for creating an invoice
export interface CreateInvoiceInput {
  paymentRequest: string;
  rHash: string;
  amount: string;
  memo?: string;
  userIdentifier?: string;
  type: InvoiceType;
  state?: InvoiceState;
  expiry: number;
  timestamp: number;
  rawData: string;
}

// Interface for user account summary
export interface UserAccountSummary {
  userId: string;
  username: string;
  accounts: {
    id: string;
    name: string;
    balance: string;
  }[];
  totalBalance: string;
}

// Interface for transaction summary
export interface TransactionSummary {
  id: string;
  createdAt: Date;
  amount: string;
  debitAccount: {
    id: string;
    name: string;
    userId: string;
  };
  creditAccount: {
    id: string;
    name: string;
    userId: string;
  };
  description?: string;
  invoice?: {
    id: string;
    rHash: string;
    paymentRequest: string;
    type: InvoiceType;
    state: InvoiceState;
  };
} 