import { Request, Response } from 'express';
import { DbService } from '../services/dbService';
import lndService, { LndService } from '../services/lndService';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError } from '../utils/errors';

// Use environment variables safely
const LND_REST_HOST = process.env.LND_REST_HOST || 'localhost:8080';
const LND_MACAROON_PATH = process.env.LND_MACAROON_PATH || '';
const LND_TLS_CERT_PATH = process.env.LND_TLS_CERT_PATH || '';
const USER_IDENTIFIER_PATTERN = process.env.USER_IDENTIFIER_PATTERN;

const dbService = new DbService();
const lndServiceInstance = new LndService(
  LND_REST_HOST,
  LND_MACAROON_PATH,
  LND_TLS_CERT_PATH,
  dbService,
  USER_IDENTIFIER_PATTERN
);

/**
 * Invoice controller for handling invoice-related requests
 */
export class InvoiceController {
  /**
   * Process an incoming invoice
   */
  processIncomingInvoice = asyncHandler(async (req: Request, res: Response) => {
    const { paymentRequest, accountId, amount, memo } = req.body as { 
      paymentRequest?: string;
      accountId: string;
      amount: string;
      memo?: string;
    };
    
    if (!accountId) {
      throw new ValidationError('Account ID is required', { accountId: 'Account ID is required' });
    }

    if (!amount) {
      throw new ValidationError('Amount is required', { amount: 'Amount is required' });
    }

    const invoice = await lndServiceInstance.createInvoiceForAccount(accountId, amount, memo || '');
    res.status(201).json({ success: true, data: invoice });
  });

  /**
   * Process an outgoing payment
   */
  processOutgoingPayment = asyncHandler(async (req: Request, res: Response) => {
    const { paymentRequest, accountId } = req.body as { 
      paymentRequest: string; 
      accountId: string;
    };
    
    if (!paymentRequest) {
      throw new ValidationError('Payment request is required', { paymentRequest: 'Payment request is required' });
    }

    if (!accountId) {
      throw new ValidationError('Account ID is required', { accountId: 'Account ID is required' });
    }

    const payment = await lndServiceInstance.sendPaymentFromAccount(accountId, paymentRequest);
    res.status(201).json({ success: true, data: payment });
  });

  /**
   * Check invoice status
   */
  checkInvoiceStatus = asyncHandler(async (req: Request, res: Response) => {
    const { rHash } = req.params as { rHash: string };
    
    if (!rHash) {
      throw new ValidationError('Payment hash is required', { rHash: 'Payment hash is required' });
    }

    const status = await lndServiceInstance.checkInvoiceStatus(rHash);
    res.json({ success: true, data: status });
  });

  /**
   * Get an invoice by payment hash
   */
  getInvoiceByRHash = asyncHandler(async (req: Request, res: Response) => {
    const { rHash } = req.params as { rHash: string };
    const invoice = await dbService.getInvoiceByRHash(rHash);
    
    res.json({ success: true, data: invoice });
  });

  /**
   * Get invoices by user identifier
   */
  getInvoicesByUserIdentifier = asyncHandler(async (req: Request, res: Response) => {
    const { userIdentifier } = req.params as { userIdentifier: string };
    const invoices = await dbService.getInvoicesByUserIdentifier(userIdentifier);
    res.json({ success: true, data: invoices });
  });
} 