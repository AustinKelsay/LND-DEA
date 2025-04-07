import { PrismaClient, InvoiceState, InvoiceType, Prisma } from '@prisma/client';
import {
  CreateUserInput,
  CreateAccountInput,
  CreateTransactionInput,
  CreateInvoiceInput,
  UserAccountSummary,
  TransactionSummary
} from '../models/interfaces';
import { DatabaseError, NotFoundError, handleDatabaseError } from '../utils/errors';

const prisma = new PrismaClient();

/**
 * Database service for handling all interactions with the database
 */
export class DbService {
  /**
   * Creates a new user
   */
  async createUser(data: CreateUserInput) {
    try {
      return await prisma.user.create({
        data: {
          username: data.username,
          // Create default accounts for user
          accounts: {
            create: [
              { name: 'lightning' }, // For tracking Lightning payments
              { name: 'revenue' },  // For tracking incoming payments
              { name: 'expense' }   // For tracking outgoing payments
            ]
          }
        }
      });
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  /**
   * Gets a user by username
   */
  async getUserByUsername(username: string) {
    try {
      return await prisma.user.findUnique({
        where: { username },
        include: { accounts: true }
      });
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  /**
   * Gets a user by ID
   */
  async getUserById(id: string) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        include: { accounts: true }
      });
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  /**
   * Gets all users
   */
  async getAllUsers() {
    try {
      return await prisma.user.findMany({
        include: { accounts: true }
      });
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  /**
   * Creates a new account
   */
  async createAccount(data: CreateAccountInput) {
    try {
      return await prisma.account.create({
        data: {
          name: data.name,
          userId: data.userId
        }
      });
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  /**
   * Gets an account by ID
   */
  async getAccountById(id: string) {
    try {
      return await prisma.account.findUnique({
        where: { id }
      });
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  /**
   * Gets an account by user ID and name
   */
  async getAccountByUserIdAndName(userId: string, name: string) {
    try {
      return await prisma.account.findFirst({
        where: {
          userId,
          name
        }
      });
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  /**
   * Gets all accounts for a user
   */
  async getAccountsByUserId(userId: string) {
    try {
      return await prisma.account.findMany({
        where: { userId }
      });
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  /**
   * Creates a new transaction (double-entry)
   */
  async createTransaction(data: CreateTransactionInput) {
    try {
      // Update account balances
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Check that accounts exist
        const debitAccount = await tx.account.findUnique({
          where: { id: data.debitAccountId }
        });
        
        if (!debitAccount) {
          throw new NotFoundError(`Debit account not found: ${data.debitAccountId}`);
        }
        
        const creditAccount = await tx.account.findUnique({
          where: { id: data.creditAccountId }
        });
        
        if (!creditAccount) {
          throw new NotFoundError(`Credit account not found: ${data.creditAccountId}`);
        }
        
        // Debit account (decrease)
        await tx.account.update({
          where: { id: data.debitAccountId },
          data: {
            balance: {
              set: (BigInt(debitAccount.balance) - BigInt(data.amount)).toString()
            }
          }
        });

        // Credit account (increase)
        await tx.account.update({
          where: { id: data.creditAccountId },
          data: {
            balance: {
              set: (BigInt(creditAccount.balance) + BigInt(data.amount)).toString()
            }
          }
        });

        // Create transaction record
        await tx.transaction.create({
          data: {
            amount: data.amount,
            debitAccountId: data.debitAccountId,
            creditAccountId: data.creditAccountId,
            invoiceId: data.invoiceId,
            description: data.description
          }
        });
      });

      return this.getTransactionSummariesByAccountId(data.debitAccountId, 1);
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  /**
   * Gets a transaction by ID
   */
  async getTransactionById(id: string) {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          debitAccount: true,
          creditAccount: true,
          invoice: true
        }
      });
      
      if (!transaction) {
        throw new NotFoundError(`Transaction not found: ${id}`);
      }
      
      return transaction;
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  /**
   * Gets transaction summaries by account ID
   */
  async getTransactionSummariesByAccountId(accountId: string, limit = 10): Promise<TransactionSummary[]> {
    try {
      const transactions = await prisma.transaction.findMany({
        where: {
          OR: [
            { debitAccountId: accountId },
            { creditAccountId: accountId }
          ]
        },
        include: {
          debitAccount: true,
          creditAccount: true,
          invoice: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      return transactions.map(tx => ({
        id: tx.id,
        createdAt: tx.createdAt,
        amount: tx.amount,
        debitAccount: {
          id: tx.debitAccount.id,
          name: tx.debitAccount.name,
          userId: tx.debitAccount.userId
        },
        creditAccount: {
          id: tx.creditAccount.id,
          name: tx.creditAccount.name,
          userId: tx.creditAccount.userId
        },
        description: tx.description || undefined,
        invoice: tx.invoice ? {
          id: tx.invoice.id,
          rHash: tx.invoice.rHash,
          paymentRequest: tx.invoice.paymentRequest,
          type: tx.invoice.type,
          state: tx.invoice.state
        } : undefined
      }));
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  /**
   * Creates a new invoice
   */
  async createInvoice(data: CreateInvoiceInput) {
    try {
      return await prisma.invoice.create({
        data: {
          paymentRequest: data.paymentRequest,
          rHash: data.rHash,
          amount: data.amount,
          memo: data.memo,
          userIdentifier: data.userIdentifier,
          type: data.type,
          state: data.state || InvoiceState.OPEN,
          expiry: data.expiry,
          timestamp: data.timestamp,
          rawData: data.rawData
        }
      });
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  /**
   * Gets an invoice by payment hash
   */
  async getInvoiceByRHash(rHash: string) {
    try {
      return await prisma.invoice.findUnique({
        where: { rHash }
      });
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  /**
   * Gets an invoice by payment request
   */
  async getInvoiceByPaymentRequest(paymentRequest: string) {
    try {
      return await prisma.invoice.findUnique({
        where: { paymentRequest }
      });
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  /**
   * Updates an invoice's state
   */
  async updateInvoiceState(id: string, state: InvoiceState) {
    try {
      return await prisma.invoice.update({
        where: { id },
        data: { state }
      });
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  /**
   * Gets account summaries for a user
   */
  async getUserAccountSummary(userId: string): Promise<UserAccountSummary> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          accounts: true
        }
      });

      if (!user) {
        throw new NotFoundError(`User with ID ${userId} not found`);
      }

      // Calculate total balance across all accounts
      const totalBalance = user.accounts.reduce((sum: string, account: { balance: string }) => {
        return (BigInt(sum) + BigInt(account.balance)).toString();
      }, '0');

      return {
        userId: user.id,
        username: user.username,
        accounts: user.accounts.map((account: { id: string; name: string; balance: string }) => ({
          id: account.id,
          name: account.name,
          balance: account.balance
        })),
        totalBalance
      };
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  /**
   * Gets all invoices for a user by identifier
   */
  async getInvoicesByUserIdentifier(userIdentifier: string) {
    try {
      return await prisma.invoice.findMany({
        where: { userIdentifier },
        orderBy: { timestamp: 'desc' }
      });
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }
} 