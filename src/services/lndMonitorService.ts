import { LndInvoice } from '../types/lnd';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { lndService } from './lndService';

export class LndMonitorService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Safely extract r_hash as hex string from invoice
   */
  private getRHashAsHex(invoice: LndInvoice): string {
    if (invoice.r_hash_str) {
      return invoice.r_hash_str;
    }
    
    if (invoice.r_hash instanceof Buffer) {
      return invoice.r_hash.toString('hex');
    }
    
    if (typeof invoice.r_hash === 'string') {
      // If it looks like hex already, return it
      if (/^[0-9a-f]+$/i.test(invoice.r_hash)) {
        return invoice.r_hash;
      }
      // Otherwise try to convert from base64/binary to hex
      try {
        return Buffer.from(invoice.r_hash, 'base64').toString('hex');
      } catch (e) {
        return invoice.r_hash;
      }
    }
    
    // Fallback in case of unexpected format
    return String(invoice.r_hash);
  }

  /**
   * Try to determine which account a transaction belongs to based on the memo
   */
  private async determineAccountFromMemo(memo: string): Promise<string | null> {
    // Check for user ID pattern in memo
    const userIdPattern = process.env.USER_IDENTIFIER_PATTERN;
    if (userIdPattern) {
      const pattern = new RegExp(userIdPattern);
      const match = memo.match(pattern);
      
      if (match && match[1]) {
        const userId = match[1];
        // Try to find an account with this user ID as the name
        const account = await this.prisma.account.findUnique({
          where: { name: userId }
        });
        
        if (account) {
          return account.id;
        }
      }
    }
    
    // Fallback: Try to find an account mentioned by name in the memo
    const accounts = await this.prisma.account.findMany();
    for (const account of accounts) {
      if (memo.toLowerCase().includes(account.name.toLowerCase())) {
        return account.id;
      }
    }
    
    // If no account found, try to use a default account
    const defaultAccount = await this.findDefaultAccount();
    return defaultAccount ? defaultAccount.id : null;
  }

  /**
   * Find or create a default account for unmatched transactions
   */
  private async findDefaultAccount(): Promise<{ id: string } | null> {
    // Look for an account named "default" or "unassigned"
    let defaultAccount = await this.prisma.account.findFirst({
      where: {
        name: {
          in: ['default', 'unassigned']
        }
      }
    });
    
    // If no default account exists, create one
    if (!defaultAccount) {
      try {
        logger.info('Creating default account for unmatched transactions');
        defaultAccount = await this.prisma.account.create({
          data: {
            name: 'default',
            description: 'Default account for unmatched transactions'
          }
        });
        logger.info(`Created default account with ID: ${defaultAccount.id}`);
      } catch (error) {
        logger.error('Failed to create default account:', error);
        return null;
      }
    }
    
    return defaultAccount;
  }

  private async checkForNewTransactions(): Promise<void> {
    logger.debug('Checking for new LND transactions...');

    try {
      // Get latest invoices from LND
      const invoicesResponse = await lndService.listInvoices();
      const invoices = invoicesResponse.invoices || [];

      // Process settled invoices (incoming payments)
      for (const invoice of invoices) {
        // Skip unsettled invoices
        if (!invoice.settled) {
          continue;
        }

        // Get r_hash as hex string
        const rHashHex = this.getRHashAsHex(invoice);

        // Check if this invoice has already been recorded
        const existingTransaction = await this.prisma.lightningTransaction.findUnique({
          where: { rHash: rHashHex }
        });

        if (existingTransaction) {
          // If it exists but wasn't completed, update it
          if (existingTransaction.status !== 'COMPLETE') {
            await this.prisma.lightningTransaction.update({
              where: { rHash: existingTransaction.rHash },
              data: { status: 'COMPLETE' }
            });
            logger.info(`Updated transaction status for invoice ${existingTransaction.rHash}`);
          }
          continue;
        }

        // Try to determine the account from the memo
        const accountId = await this.determineAccountFromMemo(invoice.memo || '');
        if (!accountId) {
          logger.warn(`Unable to determine account for invoice ${rHashHex}, memo: "${invoice.memo}"`);
          continue;
        }

        // Convert amount to string to ensure compatibility with database
        const amountString = typeof invoice.value === 'number' 
          ? invoice.value.toString() 
          : invoice.value;

        // Record the new transaction
        await this.prisma.lightningTransaction.create({
          data: {
            accountId,
            rHash: rHashHex,
            amount: amountString,
            type: 'INCOMING',
            status: 'COMPLETE',
            memo: invoice.memo || ''
          }
        });

        logger.info(`Recorded new incoming payment for account ${accountId}`);
      }

      // ... existing code for processing payments ...
    } catch (error) {
      logger.error('Error checking for new transactions:', error);
    }
  }

  // ... existing code ...
}