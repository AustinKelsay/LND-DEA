import { PrismaClient, TransactionType, TransactionStatus, LightningTransaction } from '@prisma/client';
import {
  CreateAccountInput,
  CreateLightningTransactionInput,
  AccountSummary,
  TransactionSummary,
  WebhookInput,
  WebhookSummary
} from '../models/interfaces';
import { DatabaseError, NotFoundError, handleDatabaseError } from '../utils/errors';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Database service for handling all interactions with the database
 */
export class DbService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Creates a new account
   */
  async createAccount(input: CreateAccountInput): Promise<AccountSummary> {
    const account = await this.prisma.account.create({
      data: {
        name: input.name,
        description: input.description || null
      }
    });

    return {
      id: account.id,
      name: account.name,
      description: account.description,
      balance: '0', // New accounts start with zero balance
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    };
  }

  /**
   * Gets an account by ID
   */
  async getAccount(id: string): Promise<AccountSummary | null> {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        transactions: true
      }
    });

    if (!account) {
      return null;
    }

    const balance = account.transactions.reduce((total: bigint, tx: any) => {
      const txAmount = BigInt(tx.amount);
      if (tx.type === TransactionType.INCOMING) {
        return total + txAmount;
      } else {
        return total - txAmount;
      }
    }, BigInt(0));

    return {
      id: account.id,
      name: account.name,
      description: account.description,
      balance: balance.toString(),
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    };
  }

  /**
   * Gets all accounts
   */
  async getAllAccounts(limit = 20, page = 1): Promise<{
    accounts: AccountSummary[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    const skip = (page - 1) * limit;
    const totalCount = await this.prisma.account.count();
    
    const accounts = await this.prisma.account.findMany({
      include: {
        transactions: true
      },
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' }
    });

    const accountSummaries = accounts.map((account: any) => {
      const balance = account.transactions.reduce((total: bigint, tx: any) => {
        const txAmount = BigInt(tx.amount);
        if (tx.type === TransactionType.INCOMING) {
          return total + txAmount;
        } else {
          return total - txAmount;
        }
      }, BigInt(0));

      return {
        id: account.id,
        name: account.name,
        description: account.description,
        balance: balance.toString(),
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      };
    });

    return {
      accounts: accountSummaries,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    };
  }

  /**
   * Creates a new lightning transaction
   */
  async createLightningTransaction(input: CreateLightningTransactionInput): Promise<TransactionSummary> {
    // Check if account exists
    const account = await this.prisma.account.findUnique({
      where: { id: input.accountId }
    });
    
    if (!account) {
      throw new NotFoundError(`Account with ID ${input.accountId} not found`);
    }
    
    // Check if transaction with this rHash already exists
    const existingTransaction = await this.prisma.lightningTransaction.findUnique({
      where: { rHash: input.rHash }
    });
    
    if (existingTransaction) {
      throw new Error(`Transaction with payment hash ${input.rHash} already exists`);
    }

    const transaction = await this.prisma.lightningTransaction.create({
      data: {
        accountId: input.accountId,
        rHash: input.rHash,
        amount: input.amount,
        type: input.type,
        status: input.status || TransactionStatus.PENDING,
        memo: input.memo || null
      }
    });

    return {
      id: transaction.id,
      accountId: transaction.accountId,
      rHash: transaction.rHash,
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      memo: transaction.memo,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    };
  }

  /**
   * Gets a transaction by rHash
   */
  async getTransactionByRHash(rHash: string): Promise<TransactionSummary | null> {
    const transaction = await this.prisma.lightningTransaction.findUnique({
      where: { rHash }
    });

    if (!transaction) {
      return null;
    }

    return {
      id: transaction.id,
      accountId: transaction.accountId,
      rHash: transaction.rHash,
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      memo: transaction.memo,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    };
  }

  /**
   * Updates a transaction status
   */
  async updateTransactionStatus(rHash: string, status: TransactionStatus): Promise<TransactionSummary> {
    const transaction = await this.prisma.lightningTransaction.findUnique({
      where: { rHash }
    });
    
    if (!transaction) {
      throw new NotFoundError(`Transaction with payment hash ${rHash} not found`);
    }
    
    const updatedTransaction = await this.prisma.lightningTransaction.update({
      where: { rHash },
      data: { status }
    });
    
    return {
      id: updatedTransaction.id,
      accountId: updatedTransaction.accountId,
      rHash: updatedTransaction.rHash,
      amount: updatedTransaction.amount,
      type: updatedTransaction.type,
      status: updatedTransaction.status,
      memo: updatedTransaction.memo,
      createdAt: updatedTransaction.createdAt,
      updatedAt: updatedTransaction.updatedAt
    };
  }

  /**
   * Gets all transactions
   */
  async getAllTransactions(limit = 20, page = 1): Promise<{
    transactions: TransactionSummary[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    const skip = (page - 1) * limit;
    const totalCount = await this.prisma.lightningTransaction.count();
    
    const transactions = await this.prisma.lightningTransaction.findMany({
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' }
    });

    const transactionSummaries = transactions.map((tx: any) => ({
      id: tx.id,
      accountId: tx.accountId,
      rHash: tx.rHash,
      amount: tx.amount,
      type: tx.type,
      status: tx.status,
      memo: tx.memo,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt
    }));

    return {
      transactions: transactionSummaries,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    };
  }

  /**
   * Gets transactions for an account
   */
  async getTransactionsByAccountId(accountId: string, limit = 20, page = 1) {
    try {
      const skip = (page - 1) * limit;
      const [transactions, total] = await Promise.all([
        this.prisma.lightningTransaction.findMany({
          where: { accountId },
          include: { account: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        this.prisma.lightningTransaction.count({
          where: { accountId }
        })
      ]);
      
      return {
        transactions: transactions.map((tx: any) => ({
          id: tx.id,
          accountId: tx.accountId,
          accountName: tx.account.name,
          rHash: tx.rHash,
          amount: tx.amount,
          type: tx.type,
          status: tx.status,
          memo: tx.memo || undefined,
          createdAt: tx.createdAt
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  /**
   * Gets an invoice by payment hash
   */
  async getInvoiceByRHash(rHash: string) {
    // This is a placeholder implementation
    return this.getTransactionByRHash(rHash);
  }
  
  /**
   * Gets invoices by user identifier
   */
  async getInvoicesByUserIdentifier(userIdentifier: string) {
    try {
      const pattern = process.env.USER_IDENTIFIER_PATTERN;
      if (!pattern) {
        return [];
      }

      // Look for transactions with the user identifier in the memo
      const transactions = await this.prisma.lightningTransaction.findMany({
        where: {
          memo: {
            contains: `userid:${userIdentifier}`
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return transactions.map((tx: LightningTransaction) => ({
        id: tx.id,
        accountId: tx.accountId,
        rHash: tx.rHash,
        amount: tx.amount,
        type: tx.type,
        status: tx.status,
        memo: tx.memo,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt
      }));
    } catch (error) {
      logger.error('Error getting invoices by user identifier:', error);
      return [];
    }
  }
  
  /**
   * Creates a webhook for an account
   */
  async createWebhook(input: WebhookInput): Promise<WebhookSummary> {
    try {
      // Check if account exists
      const account = await this.prisma.account.findUnique({
        where: { id: input.accountId }
      });
      
      if (!account) {
        throw new NotFoundError(`Account with ID ${input.accountId} not found`);
      }
      
      const webhook = await this.prisma.webhook.create({
        data: {
          accountId: input.accountId,
          url: input.url,
          secret: input.secret,
          enabled: input.enabled ?? true
        }
      });
      
      return {
        id: webhook.id,
        accountId: webhook.accountId,
        url: webhook.url,
        secret: webhook.secret,
        enabled: webhook.enabled,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt
      };
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }
  
  /**
   * Gets all webhooks for an account
   */
  async getWebhooksByAccountId(accountId: string): Promise<WebhookSummary[]> {
    try {
      const webhooks = await this.prisma.webhook.findMany({
        where: { accountId }
      });
      
      return webhooks.map((webhook: any) => ({
        id: webhook.id,
        accountId: webhook.accountId,
        url: webhook.url,
        secret: webhook.secret,
        enabled: webhook.enabled,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt
      }));
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }
  
  /**
   * Gets a webhook by ID
   */
  async getWebhookById(id: string): Promise<WebhookSummary | null> {
    try {
      const webhook = await this.prisma.webhook.findUnique({
        where: { id }
      });
      
      if (!webhook) {
        return null;
      }
      
      return {
        id: webhook.id,
        accountId: webhook.accountId,
        url: webhook.url,
        secret: webhook.secret,
        enabled: webhook.enabled,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt
      };
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }
  
  /**
   * Updates a webhook
   */
  async updateWebhook(id: string, data: Partial<WebhookInput>): Promise<WebhookSummary> {
    try {
      const webhook = await this.prisma.webhook.findUnique({
        where: { id }
      });
      
      if (!webhook) {
        throw new NotFoundError(`Webhook with ID ${id} not found`);
      }
      
      const updatedWebhook = await this.prisma.webhook.update({
        where: { id },
        data
      });
      
      return {
        id: updatedWebhook.id,
        accountId: updatedWebhook.accountId,
        url: updatedWebhook.url,
        secret: updatedWebhook.secret,
        enabled: updatedWebhook.enabled,
        createdAt: updatedWebhook.createdAt,
        updatedAt: updatedWebhook.updatedAt
      };
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }
  
  /**
   * Deletes a webhook
   */
  async deleteWebhook(id: string): Promise<boolean> {
    try {
      const webhook = await this.prisma.webhook.findUnique({
        where: { id }
      });
      
      if (!webhook) {
        return false;
      }
      
      await this.prisma.webhook.delete({
        where: { id }
      });
      
      return true;
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }
} 