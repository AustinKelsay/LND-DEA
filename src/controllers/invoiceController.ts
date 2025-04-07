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
    const { paymentRequest, userId } = req.body as { paymentRequest: string; userId?: string };
    
    if (!paymentRequest) {
      throw new ValidationError('Payment request is required', { paymentRequest: 'Payment request is required' });
    }

    const invoice = await lndServiceInstance.processIncomingInvoice(paymentRequest, userId);
    res.status(201).json({ success: true, data: invoice });
  });

  /**
   * Process an outgoing payment
   */
  processOutgoingPayment = asyncHandler(async (req: Request, res: Response) => {
    const { paymentRequest, userId } = req.body as { paymentRequest: string; userId?: string };
    
    if (!paymentRequest) {
      throw new ValidationError('Payment request is required', { paymentRequest: 'Payment request is required' });
    }

    const invoice = await lndServiceInstance.processOutgoingPayment(paymentRequest, userId);
    res.status(201).json({ success: true, data: invoice });
  });

  /**
   * Settle an invoice
   */
  settleInvoice = asyncHandler(async (req: Request, res: Response) => {
    const { rHash } = req.params as { rHash: string };
    
    if (!rHash) {
      throw new ValidationError('Payment hash is required', { rHash: 'Payment hash is required' });
    }

    const invoice = await lndServiceInstance.settleInvoice(rHash);
    res.json({ success: true, data: invoice });
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