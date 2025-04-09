import fs from 'fs';
import * as https from 'https';
import { IncomingMessage } from 'http';
import { logger } from '../utils/logger';
import { 
  LndInfo, 
  LndInvoicesResponse, 
  LndPaymentsResponse,
  LndCreateInvoiceRequest,
  LndCreateInvoiceResponse,
  LndDecodedPaymentRequest,
  LndSendPaymentResponse,
  LndInvoice
} from '../types/lnd';
import { DbService } from './dbService';
import { EventEmitter } from 'events';
import { TransactionType, TransactionStatus } from '@prisma/client';
import crypto from 'crypto';
import { WebhookSummary, WebhookInput } from '../models/interfaces';
// Replace node-fetch with built-in https
// import fetch from 'node-fetch';
// Replace ws module with a simple polling implementation since we don't have ws installed

/**
 * Helper functions for handling LND API data types
 */
export const lndUtils = {
  /**
   * Convert r_hash to hex string, handling multiple possible formats
   */
  toHexString(value: string | Buffer | unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    // If it's already a string and looks like hex, return it
    if (typeof value === 'string') {
      if (/^[0-9a-f]+$/i.test(value)) {
        return value;
      }
      // Try to convert from base64 or binary
      try {
        return Buffer.from(value, 'base64').toString('hex');
      } catch (e) {
        return value;
      }
    }
    
    // If it's a Buffer, convert to hex
    if (Buffer.isBuffer(value)) {
      return value.toString('hex');
    }
    
    // Fallback for unexpected formats
    return String(value);
  },

  /**
   * Extract user identifier from invoice memo if it exists
   */
  extractUserIdentifier(memo: string, pattern?: string): string | undefined {
    if (!pattern) return undefined;
    
    try {
      const regex = new RegExp(pattern);
      const match = memo.match(regex);
      return match ? match[1] : undefined;
    } catch (error: any) {
      logger.error('Error extracting user identifier:', error);
      return undefined;
    }
  }
};

/**
 * Error class for LND API errors
 */
export class LndApiError extends Error {
  statusCode: number;
  responseData?: string;

  constructor(message: string, statusCode: number, responseData?: string) {
    super(message);
    this.name = 'LndApiError';
    this.statusCode = statusCode;
    this.responseData = responseData;
  }
}

/**
 * Interface for webhook registration
 */
interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
}

/**
 * Interface for invoice subscription callback
 */
interface InvoiceCallback {
  rHash: string;
  callback: (invoice: LndInvoice) => void;
}

// Define our own Webhook interface
interface Webhook {
  id: string;
  accountId: string;
  url: string;
  secret: string;
  enabled: boolean;
}

/**
 * Service for interacting with the Lightning Network Daemon (LND) REST API
 */
export class LndService extends EventEmitter {
  private host: string;
  private macaroonHex: string;
  private tlsCert: Buffer | null = null;
  private dbService: DbService;
  private userIdPattern?: string;
  private webhooks: WebhookConfig[] = [];
  private invoiceCallbacks: Map<string, InvoiceCallback[]> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL = 10000; // 10 seconds

  constructor(
    host: string = '',
    macaroonHex: string = '',
    tlsCertPath: string = '',
    dbService?: DbService,
    userIdPattern?: string
  ) {
    super();
    this.host = host;
    this.macaroonHex = macaroonHex;
    this.dbService = dbService || new DbService();
    this.userIdPattern = userIdPattern;
    
    if (!this.host) {
      logger.warn('LND_REST_HOST not set. LND integration will not work.');
    }
    
    if (!this.macaroonHex) {
      logger.warn('LND_MACAROON_PATH not set. LND integration will not work.');
    }
    
    // If TLS cert path is provided and exists, load it
    if (tlsCertPath) {
      try {
        // Check if the value is a path to a file or a base64 string
        if (fs.existsSync(tlsCertPath)) {
          this.tlsCert = fs.readFileSync(tlsCertPath);
        } else {
          // Assume it's a base64 encoded cert
          this.tlsCert = Buffer.from(tlsCertPath, 'base64');
        }
      } catch (error) {
        logger.error('Error loading TLS certificate:', error);
      }
    }

    // Initialize polling if properly configured
    if (this.isConfigured()) {
      this.setupPolling();
    }
  }

  /**
   * Check if LND connection is properly configured
   */
  private isConfigured(): boolean {
    return Boolean(this.host && this.macaroonHex);
  }

  /**
   * Setup polling for invoice updates
   */
  private setupPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    this.pollingInterval = setInterval(async () => {
      try {
        // Fetch latest invoices
        const response = await this.listInvoices(100);
        if (!response.invoices) return;
        
        // Process each invoice
        for (const invoice of response.invoices) {
          const rHash = lndUtils.toHexString(invoice.r_hash_str || invoice.r_hash);
          await this.handleInvoiceUpdate(invoice);
          
          // Notify any specific callbacks for this invoice
          const callbacks = this.invoiceCallbacks.get(rHash) || [];
          callbacks.forEach(cb => cb.callback(invoice));
        }
      } catch (error) {
        logger.error('Error during invoice polling:', error);
      }
    }, this.POLL_INTERVAL);
    
    logger.info(`Started polling for invoice updates every ${this.POLL_INTERVAL / 1000} seconds`);
  }

  /**
   * Stop polling for updates
   */
  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      logger.info('Stopped polling for invoice updates');
    }
  }

  /**
   * Handle an invoice update from LND
   */
  private async handleInvoiceUpdate(invoice: LndInvoice): Promise<void> {
    // Normalize r_hash to hex string
    const rHash = lndUtils.toHexString(invoice.r_hash_str || invoice.r_hash);
    
    // Check if we need to process this invoice
    const transaction = await this.dbService.getTransactionByRHash(rHash);
    
    if (transaction) {
      // This is an invoice we're tracking
      const newStatus = invoice.settled ? TransactionStatus.COMPLETE : 
                         invoice.state === 'CANCELED' ? TransactionStatus.FAILED : 
                         TransactionStatus.PENDING;
      
      if (transaction.status !== newStatus) {
        // Update transaction status
        await this.dbService.updateTransactionStatus(rHash, newStatus);
        
        // Emit event for this update
        this.emit('invoice.updated', { rHash, status: newStatus, invoice });
        
        // Send webhook notifications
        this.notifyWebhooks('invoice.updated', { 
          rHash, 
          status: newStatus, 
          accountId: transaction.accountId,
          amount: String(transaction.amount),
          type: transaction.type
        });
      }
    } else if (invoice.memo && this.userIdPattern) {
      // Check if this is a new invoice we should track based on memo
      const userIdentifier = lndUtils.extractUserIdentifier(invoice.memo, this.userIdPattern);
      
      if (userIdentifier) {
        try {
          // Try to find the account with this name
          const accounts = await this.dbService.getAllAccounts();
          const account = accounts.accounts.find(acc => acc.name === userIdentifier);
          
          if (account) {
            // This is a payment for one of our tracked accounts
            const status = invoice.settled ? TransactionStatus.COMPLETE : TransactionStatus.PENDING;
            const amount = (invoice.value !== undefined) ? String(invoice.value) : '0';
            
            // Create a new transaction record
            const newTransaction = await this.dbService.createLightningTransaction({
              accountId: account.id,
              rHash,
              amount,
              type: TransactionType.INCOMING,
              status,
              memo: invoice.memo
            });
            
            // Emit event for this new invoice
            this.emit('invoice.created', { transaction: newTransaction, invoice });
            
            // Send webhook notifications
            this.notifyWebhooks('invoice.created', { 
              rHash, 
              accountId: account.id,
              amount,
              status,
              type: TransactionType.INCOMING
            });
          }
        } catch (error) {
          logger.error('Error processing user identifier from invoice:', error);
        }
      }
    }
  }

  /**
   * Generic method to make requests to the LND REST API
   */
  private async makeRequest<T>(method: string, endpoint: string, data?: any): Promise<T> {
    if (!this.isConfigured()) {
      throw new LndApiError('LND connection not configured correctly', 500, '');
    }

    return new Promise<T>((resolve, reject) => {
      // Parse hostname and port separately
      const [hostname, portStr] = this.host.split(':');
      // Default to port 8080 if not specified
      const port = portStr ? parseInt(portStr, 10) : 8080;
      
      // Log connection details for debugging
      logger.debug(`Connecting to LND REST API at ${hostname}:${port}`);
      
      const options = {
        method,
        hostname,
        port,
        path: `/v1/${endpoint}`,
        headers: {
          'Grpc-Metadata-macaroon': this.macaroonHex,
        },
        rejectUnauthorized: false,
      };

      const req = https.request(options, (res: IncomingMessage) => {
        let data = '';
        
        res.on('data', (chunk: Buffer) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data ? JSON.parse(data) : {} as T);
            } else {
              reject(new LndApiError(
                `LND API error: ${res.statusCode}`, 
                res.statusCode || 500,
                data
              ));
            }
          } catch (error) {
            reject(new LndApiError(
              `Failed to parse LND response: ${error}`, 
              500
            ));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(new LndApiError(`LND request failed: ${error.message}`, 500));
      });
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  /**
   * Register a webhook for specific events
   */
  public registerWebhook(webhook: WebhookConfig): void {
    this.webhooks.push(webhook);
    logger.info(`Registered webhook for events: ${webhook.events.join(', ')} at ${webhook.url}`);
  }

  /**
   * Remove a webhook
   */
  public removeWebhook(url: string): boolean {
    const initialLength = this.webhooks.length;
    this.webhooks = this.webhooks.filter(wh => wh.url !== url);
    return this.webhooks.length < initialLength;
  }

  /**
   * Sends webhook notifications for invoice events
   */
  private async notifyWebhooks(event: string, data: any): Promise<void> {
    try {
      if (!data.accountId) {
        logger.warn('Cannot send webhook notification: accountId is missing');
        return;
      }
      
      // Check if there are any webhook configurations for this account
      const webhooks = await this.dbService.getWebhooksByAccountId(data.accountId);
      
      if (!webhooks || webhooks.length === 0) {
        logger.debug(`No webhooks found for account ${data.accountId}`);
        return;
      }
      
      logger.info(`Sending ${event} webhook to ${webhooks.length} endpoints for account ${data.accountId}`);
      
      // Send notifications to all configured webhooks
      const notificationPromises = webhooks.filter(webhook => webhook.enabled).map(async (webhook: WebhookSummary) => {
        try {
          // Use built-in https module instead of fetch
          const url = new URL(webhook.url);
          const payload = {
            event,
            data,
            timestamp: new Date().toISOString()
          };
          const requestData = JSON.stringify(payload);
          
          const signature = this.generateWebhookSignature(webhook.secret, payload);
          
          return new Promise<void>((resolve, reject) => {
            const req = https.request({
              hostname: url.hostname,
              port: url.port || (url.protocol === 'https:' ? 443 : 80),
              path: url.pathname + url.search,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestData),
                'X-Webhook-Signature': signature
              }
            }, (res: IncomingMessage) => {
              let responseData = '';
              
              res.on('data', (chunk: Buffer) => {
                responseData += chunk.toString();
              });
              
              res.on('end', () => {
                if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                  logger.warn(`Webhook notification failed for ${webhook.url}: ${res.statusCode} ${res.statusMessage}`);
                  logger.debug(`Webhook response: ${responseData}`);
                } else {
                  logger.debug(`Successfully sent webhook to ${webhook.url}`);
                }
                resolve();
              });
            });
            
            req.on('error', (error) => {
              logger.warn(`Error sending webhook notification to ${webhook.url}:`, error);
              reject(error);
            });
            
            req.write(requestData);
            req.end();
          });
        } catch (error) {
          logger.warn(`Error sending webhook notification to ${webhook.url}:`, error);
          // We don't want to fail the entire process if one webhook fails
        }
      });
      
      await Promise.all(notificationPromises);
    } catch (error) {
      logger.error('Error sending webhook notifications:', error);
    }
  }
  
  /**
   * Generates a signature for webhook payloads
   */
  private generateWebhookSignature(secret: string, data: any): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(data));
    return hmac.digest('hex');
  }

  /**
   * Get node info
   */
  async getInfo(): Promise<LndInfo> {
    return this.makeRequest<LndInfo>('GET', 'getinfo');
  }

  /**
   * Get a list of all invoices
   */
  async listInvoices(numMaxInvoices = 100): Promise<LndInvoicesResponse> {
    const response = await this.makeRequest<LndInvoicesResponse>('GET', `invoices?num_max_invoices=${numMaxInvoices}`);
    
    // Normalize r_hash values to hex strings for consistency
    if (response.invoices) {
      response.invoices = response.invoices.map(invoice => ({
        ...invoice,
        r_hash_str: lndUtils.toHexString(invoice.r_hash_str || invoice.r_hash)
      }));
    }
    
    return response;
  }

  /**
   * Get a list of all payments
   */
  async listPayments(includeIncomplete = true, maxPayments = 100): Promise<LndPaymentsResponse> {
    return this.makeRequest<LndPaymentsResponse>(
      'GET', 
      `payments?include_incomplete=${includeIncomplete}&max_payments=${maxPayments}`
    );
  }

  /**
   * Create a new invoice
   */
  async createInvoice(value: string, memo: string, expiry = 3600): Promise<LndCreateInvoiceResponse> {
    const requestData: LndCreateInvoiceRequest = {
      value,
      memo,
      expiry
    };
    return this.makeRequest<LndCreateInvoiceResponse>('POST', 'invoices', requestData);
  }

  /**
   * Create an invoice for a specific account
   */
  async createInvoiceForAccount(accountId: string, amount: string, memo = '', expiry = 3600): Promise<any> {
    try {
      // Get the account to verify it exists
      const account = await this.dbService.getAccount(accountId);
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }
      
      // Append account identifier to memo if userIdPattern is configured
      let finalMemo = memo;
      if (this.userIdPattern) {
        const accountIdentifier = `userid:${account.name}`;
        finalMemo = memo ? `${memo} ${accountIdentifier}` : accountIdentifier;
      }
      
      // Create the invoice in LND
      const invoice = await this.createInvoice(amount, finalMemo, expiry);
      
      // Extract r_hash as hex string
      const rHash = lndUtils.toHexString(invoice.r_hash);
      
      // Create a transaction record in our system
      const transaction = await this.dbService.createLightningTransaction({
        accountId,
        rHash,
        amount,
        type: TransactionType.INCOMING,
        status: TransactionStatus.PENDING,
        memo: finalMemo
      });
      
      // Emit event for the new invoice
      this.emit('invoice.created', { transaction, invoice });
      
      // Send webhook notifications
      this.notifyWebhooks('invoice.created', { 
        rHash, 
        accountId,
        amount,
        status: TransactionStatus.PENDING,
        type: TransactionType.INCOMING,
        paymentRequest: invoice.payment_request
      });
      
      // Return both the LND invoice and our transaction
      return {
        invoice,
        transaction
      };
    } catch (error) {
      logger.error('Error creating invoice for account:', error);
      throw error;
    }
  }

  /**
   * Decode a payment request
   */
  async decodePaymentRequest(payReq: string): Promise<LndDecodedPaymentRequest> {
    return this.makeRequest<LndDecodedPaymentRequest>('GET', `payreq/${payReq}`);
  }

  /**
   * Send payment using a payment request
   */
  async sendPayment(paymentRequest: string): Promise<LndSendPaymentResponse> {
    return this.makeRequest<LndSendPaymentResponse>('POST', 'channels/transactions', {
      payment_request: paymentRequest
    });
  }

  /**
   * Send payment from a specific account
   */
  async sendPaymentFromAccount(accountId: string, paymentRequest: string): Promise<any> {
    try {
      // Get the account to verify it exists and check balance
      const account = await this.dbService.getAccount(accountId);
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }
      
      // Decode the payment request to get amount
      const decodedRequest = await this.decodePaymentRequest(paymentRequest);
      const amount = decodedRequest.num_satoshis !== undefined 
        ? String(decodedRequest.num_satoshis) 
        : '0';
      
      // Get account balance from the getAccount call
      const balance = account.balance;
      
      // Check if account has sufficient balance
      if (BigInt(balance) < BigInt(amount)) {
        throw new Error(`Insufficient balance: required ${amount}, available ${balance}`);
      }
      
      // First create a pending transaction
      const rHash = lndUtils.toHexString(decodedRequest.payment_hash);
      const transaction = await this.dbService.createLightningTransaction({
        accountId,
        rHash,
        amount,
        type: TransactionType.OUTGOING,
        status: TransactionStatus.PENDING,
        memo: decodedRequest.description || ''
      });
      
      try {
        // Send the payment through LND
        const paymentResult = await this.sendPayment(paymentRequest);
        
        // Update transaction to complete if payment was successful
        if (paymentResult.payment_error) {
          await this.dbService.updateTransactionStatus(rHash, TransactionStatus.FAILED);
          
          // Emit event for failed payment
          this.emit('payment.failed', { 
            rHash, 
            accountId, 
            error: paymentResult.payment_error 
          });
          
          // Send webhook notification
          this.notifyWebhooks('payment.failed', { 
            rHash, 
            accountId,
            amount,
            error: paymentResult.payment_error
          });
          
          throw new Error(`Payment failed: ${paymentResult.payment_error}`);
        } else {
          await this.dbService.updateTransactionStatus(rHash, TransactionStatus.COMPLETE);
          
          // Emit event for successful payment
          this.emit('payment.completed', { 
            rHash, 
            accountId, 
            amount 
          });
          
          // Send webhook notification
          this.notifyWebhooks('payment.completed', { 
            rHash, 
            accountId,
            amount,
            status: TransactionStatus.COMPLETE,
            type: TransactionType.OUTGOING
          });
        }
        
        // Return both the LND payment result and our transaction
        return {
          payment: paymentResult,
          transaction: await this.dbService.getTransactionByRHash(rHash) // Get updated transaction
        };
      } catch (error) {
        // If the payment fails, update the transaction status
        await this.dbService.updateTransactionStatus(rHash, TransactionStatus.FAILED);
        throw error;
      }
    } catch (error) {
      logger.error('Error sending payment from account:', error);
      throw error;
    }
  }

  /**
   * Process an incoming invoice
   */
  private async processInvoice(invoice: any): Promise<void> {
    // Make sure amount is a string - handle type conversion safely
    let amount: string = '0';
    if (invoice.value_msat) {
      const msat = parseInt(invoice.value_msat.toString(), 10);
      amount = (msat / 1000).toString();
    } else if (invoice.value) {
      amount = invoice.value.toString();
    }
    
    // ... existing code ...
  }

  /**
   * Process an incoming invoice
   * This method handles the full flow of creating an invoice for an account
   */
  async processIncomingInvoice(accountId: string, amount: string, memo = '', expiry = 3600): Promise<any> {
    return this.createInvoiceForAccount(accountId, amount, memo, expiry);
  }

  /**
   * Process an outgoing payment
   * This method handles the full flow of sending a payment from an account
   */
  async processOutgoingPayment(accountId: string, paymentRequest: string): Promise<any> {
    return this.sendPaymentFromAccount(accountId, paymentRequest);
  }

  /**
   * Check if an invoice has been settled
   */
  async checkInvoiceStatus(rHash: string): Promise<{settled: boolean, status: TransactionStatus}> {
    try {
      // First check our database
      const transaction = await this.dbService.getTransactionByRHash(rHash);
      
      if (!transaction) {
        throw new Error(`Transaction not found for r_hash: ${rHash}`);
      }
      
      // If already marked as complete or failed in our system, return that status
      if (transaction.status === TransactionStatus.COMPLETE) {
        return { settled: true, status: TransactionStatus.COMPLETE };
      }
      
      if (transaction.status === TransactionStatus.FAILED) {
        return { settled: false, status: TransactionStatus.FAILED };
      }
      
      // Otherwise, check with LND for the current status
      // We need to look up the invoice in LND - this would be more efficient with a specific
      // lookup API but we'll use the list method for now
      const invoices = await this.listInvoices(100);
      const invoice = invoices.invoices?.find(inv => {
        const invHash = lndUtils.toHexString(inv.r_hash_str || inv.r_hash);
        return invHash === rHash;
      });
      
      if (invoice) {
        const newStatus = invoice.settled ? TransactionStatus.COMPLETE : 
                           invoice.state === 'CANCELED' ? TransactionStatus.FAILED : 
                           TransactionStatus.PENDING;
        
        // Update the status in our database if changed
        if (transaction.status !== newStatus) {
          await this.dbService.updateTransactionStatus(rHash, newStatus);
        }
        
        return { 
          settled: invoice.settled, 
          status: newStatus 
        };
      }
      
      // Invoice not found in LND, keep status as is
      return { settled: false, status: transaction.status };
    } catch (error) {
      logger.error(`Error checking invoice status for r_hash ${rHash}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to a specific invoice and receive updates
   */
  async subscribeToSingleInvoice(rHash: string, callback: (invoice: LndInvoice) => void): Promise<() => void> {
    // Register this callback for the specific r_hash
    if (!this.invoiceCallbacks.has(rHash)) {
      this.invoiceCallbacks.set(rHash, []);
    }
    
    const callbacks = this.invoiceCallbacks.get(rHash) || [];
    callbacks.push({ rHash, callback });
    this.invoiceCallbacks.set(rHash, callbacks);
    
    // Immediately check current status
    try {
      const invoices = await this.listInvoices(100);
      const invoice = invoices.invoices?.find(inv => {
        const invHash = lndUtils.toHexString(inv.r_hash_str || inv.r_hash);
        return invHash === rHash;
      });
      
      if (invoice) {
        callback(invoice);
      }
    } catch (error) {
      logger.error(`Error getting initial invoice status for r_hash ${rHash}:`, error);
    }
    
    // Return a function to unsubscribe
    return () => {
      const callbacks = this.invoiceCallbacks.get(rHash) || [];
      const filtered = callbacks.filter(cb => cb.callback !== callback);
      
      if (filtered.length > 0) {
        this.invoiceCallbacks.set(rHash, filtered);
      } else {
        this.invoiceCallbacks.delete(rHash);
      }
    };
  }

  /**
   * Get multiple invoices by their r_hash values
   * This is more efficient than checking each invoice individually
   */
  async getInvoicesByRHash(rHashes: string[]): Promise<Map<string, LndInvoice>> {
    try {
      if (!this.isConfigured()) {
        throw new Error('LND service not properly configured');
      }
      
      if (rHashes.length === 0) {
        return new Map();
      }
      
      // Fetch latest invoices
      const response = await this.listInvoices(100);
      const result = new Map<string, LndInvoice>();
      
      if (!response.invoices) {
        return result;
      }
      
      // Create a set for faster lookups
      const rHashSet = new Set(rHashes);
      
      // Find all matching invoices
      for (const invoice of response.invoices) {
        const rHash = lndUtils.toHexString(invoice.r_hash_str || String(invoice.r_hash));
        if (rHashSet.has(rHash)) {
          result.set(rHash, invoice);
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Error getting invoices by r_hash:', error);
      throw error;
    }
  }

  /**
   * Process multiple invoices in batch
   * Updates the database with the latest invoice status for multiple invoices
   */
  async processMultipleInvoices(invoices: Array<{ rHash: string, accountId: string }>): Promise<void> {
    try {
      if (!this.isConfigured()) {
        throw new Error('LND service not properly configured');
      }
      
      if (invoices.length === 0) return;
      
      // Get all invoice r_hash values
      const rHashes = invoices.map(i => i.rHash);
      
      // Get latest status for all invoices from LND
      const lndInvoicesMap = await this.getInvoicesByRHash(rHashes);
      
      // Process each invoice
      const updatePromises = invoices.map(async ({ rHash, accountId }) => {
        const invoice = lndInvoicesMap.get(rHash);
        
        if (!invoice) {
          logger.warn(`Invoice ${rHash} not found in LND`);
          return;
        }
        
        // Check if invoice is settled
        if (invoice.settled) {
          // Update the invoice in the database
          await this.dbService.updateTransactionStatus(rHash, TransactionStatus.COMPLETE);
          
          // Trigger webhook notification if necessary
          await this.notifyWebhooks('invoice.updated', { 
            rHash, 
            status: TransactionStatus.COMPLETE,
            accountId,
            amount: String(invoice.value || '0'),
            type: TransactionType.INCOMING
          });
        }
      });
      
      await Promise.all(updatePromises);
    } catch (error) {
      logger.error('Error processing multiple invoices:', error);
      throw error;
    }
  }

  /**
   * Create a webhook for an account
   */
  async createWebhookForAccount(accountId: string, url: string, secret: string = ''): Promise<WebhookSummary> {
    try {
      // Generate a secret if none provided
      const webhookSecret = secret || crypto.randomBytes(32).toString('hex');
      
      // Create the webhook in database
      const webhook = await this.dbService.createWebhook({
        accountId,
        url,
        secret: webhookSecret,
        enabled: true
      });
      
      logger.info(`Created webhook for account ${accountId} at ${url}`);
      return webhook;
    } catch (error) {
      logger.error('Error creating webhook for account:', error);
      throw error;
    }
  }
  
  /**
   * Get all webhooks for an account
   */
  async getWebhooksForAccount(accountId: string): Promise<WebhookSummary[]> {
    try {
      return await this.dbService.getWebhooksByAccountId(accountId);
    } catch (error) {
      logger.error('Error retrieving webhooks for account:', error);
      throw error;
    }
  }
  
  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<boolean> {
    try {
      return await this.dbService.deleteWebhook(webhookId);
    } catch (error) {
      logger.error('Error deleting webhook:', error);
      throw error;
    }
  }
  
  /**
   * Enable or disable a webhook
   */
  async updateWebhookStatus(webhookId: string, enabled: boolean): Promise<WebhookSummary> {
    try {
      return await this.dbService.updateWebhook(webhookId, { enabled });
    } catch (error) {
      logger.error('Error updating webhook status:', error);
      throw error;
    }
  }
}

// Export a singleton instance
const lndService = new LndService(
  process.env.LND_REST_HOST,
  process.env.LND_MACAROON_PATH,
  process.env.LND_TLS_CERT_PATH,
  undefined,
  process.env.USER_IDENTIFIER_PATTERN
);
export { lndService };
export default lndService; 