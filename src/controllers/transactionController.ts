import { Request, Response } from 'express';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError, NotFoundError } from '../utils/errors';
import { DbService } from '../services/dbService';

const dbService = new DbService();

/**
 * Transaction controller for handling lightning transaction-related requests
 */
export class TransactionController {
  /**
   * Create a new lightning transaction
   */
  createTransaction = asyncHandler(async (req: Request, res: Response) => {
    const { 
      accountId, 
      rHash, 
      amount, 
      type, 
      status, 
      memo 
    } = req.body;
    
    if (!accountId) {
      throw new ValidationError('Account ID is required');
    }

    if (!rHash) {
      throw new ValidationError('Payment hash (rHash) is required');
    }

    if (!amount) {
      throw new ValidationError('Amount is required');
    }

    if (!type || !Object.values(TransactionType).includes(type)) {
      throw new ValidationError('Valid transaction type (INCOMING or OUTGOING) is required');
    }

    const transaction = await dbService.createLightningTransaction({
      accountId,
      rHash,
      amount,
      type,
      status: status || TransactionStatus.PENDING,
      memo
    });

    res.status(201).json({ success: true, data: transaction });
  });

  /**
   * Get all transactions
   */
  getAllTransactions = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '20');
    
    const result = await dbService.getAllTransactions(limit, page);
    
    res.json({
      success: true,
      data: result.transactions,
      pagination: result.pagination
    });
  });

  /**
   * Get transaction by rHash
   */
  getTransactionByRHash = asyncHandler(async (req: Request, res: Response) => {
    const { rHash } = req.params;
    
    const transaction = await dbService.getTransactionByRHash(rHash);
    
    if (!transaction) {
      throw new NotFoundError(`Transaction with payment hash ${rHash} not found`);
    }
    
    res.json({ success: true, data: transaction });
  });

  /**
   * Update transaction status
   */
  updateTransactionStatus = asyncHandler(async (req: Request, res: Response) => {
    const { rHash } = req.params;
    const { status } = req.body;
    
    if (!status || !Object.values(TransactionStatus).includes(status)) {
      throw new ValidationError('Valid transaction status (PENDING, COMPLETE, or FAILED) is required');
    }
    
    const transaction = await dbService.updateTransactionStatus(rHash, status);
    
    res.json({ success: true, data: transaction });
  });
} 