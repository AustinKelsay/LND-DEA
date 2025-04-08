import fs from 'fs';
import https from 'https';
import { IncomingMessage } from 'http';
import { logger } from '../utils/logger';
import { 
  LndInfo, 
  LndInvoicesResponse, 
  LndPaymentsResponse,
  LndCreateInvoiceRequest,
  LndCreateInvoiceResponse,
  LndDecodedPaymentRequest,
  LndSendPaymentResponse
} from '../types/lnd';
import { DbService } from './dbService';

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
 * Service for interacting with the Lightning Network Daemon (LND) REST API
 */
export class LndService {
  private host: string;
  private macaroonHex: string;
  private tlsCert: Buffer | null = null;
  private dbService: DbService;
  private userIdPattern?: string;

  constructor(
    host: string = '',
    macaroonHex: string = '',
    tlsCertPath: string = '',
    dbService?: DbService,
    userIdPattern?: string
  ) {
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
  }

  /**
   * Check if LND connection is properly configured
   */
  private isConfigured(): boolean {
    return Boolean(this.host && this.macaroonHex);
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
   * Process an incoming invoice
   */
  async processIncomingInvoice(paymentRequest: string, userId?: string): Promise<any> {
    // Implementation would depend on your application logic
    return { success: true };
  }

  /**
   * Process an outgoing payment
   */
  async processOutgoingPayment(paymentRequest: string, userId?: string): Promise<any> {
    // Implementation would depend on your application logic
    return { success: true };
  }

  /**
   * Settle an invoice
   */
  async settleInvoice(rHash: string): Promise<any> {
    // Implementation would depend on your application logic
    return { success: true };
  }
}

// Export a singleton instance
const lndService = new LndService(
  process.env.LND_REST_HOST,
  process.env.LND_MACAROON_PATH,
  process.env.LND_TLS_CERT_PATH
);
export { lndService };
export default lndService; 