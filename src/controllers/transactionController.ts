import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError, NotFoundError } from '../utils/errors';

// Import lndUtils if it exists, otherwise we'll create a simpler version here
let lndUtils: { toHexString: (value: string | Buffer | unknown) => string };

try {
  const lndModule = require('../services/lndService');
  lndUtils = lndModule.lndUtils;
} catch (e) {
  // Fallback implementation if the module can't be imported
  lndUtils = {
    toHexString(value: string | Buffer | unknown): string {
      if (value === null || value === undefined) {
        return '';
      }
      
      if (typeof value === 'string') {
        return value;
      }
      
      if (Buffer.isBuffer(value)) {
        return value.toString('hex');
      }
      
      return String(value);
    }
  };
}

const prisma = new PrismaClient();

// Define transaction types as string literals
type TransactionType = 'INCOMING' | 'OUTGOING';
type TransactionStatus = 'PENDING' | 'COMPLETE' | 'FAILED';

/**
 * Transaction controller for handling lightning transaction-related requests
 */
export class TransactionController {
  /**
   * Create a new transaction
   */
  createTransaction = asyncHandler(async (req: Request, res: Response) => {
    const { 
      accountId, 
      rHash, 
      amount, 
      type, 
      status, 
      memo 
    } = req.body as { 
      accountId: string; 
      rHash: string; 
      amount: string; 
      type: TransactionType; 
      status: TransactionStatus; 
      memo?: string 
    };
    
    // Validate required fields
    if (!accountId) {
      throw new ValidationError('Account ID is required', { accountId: 'Account ID is required' });
    }
    
    if (!rHash) {
      throw new ValidationError('Payment hash is required', { rHash: 'Payment hash is required' });
    }
    
    if (!amount) {
      throw new ValidationError('Amount is required', { amount: 'Amount is required' });
    }
    
    const validTypes: TransactionType[] = ['INCOMING', 'OUTGOING'];
    if (!type || !validTypes.includes(type as TransactionType)) {
      throw new ValidationError('Valid transaction type is required', { type: 'Must be INCOMING or OUTGOING' });
    }
    
    const validStatuses: TransactionStatus[] = ['PENDING', 'COMPLETE', 'FAILED'];
    if (!status || !validStatuses.includes(status as TransactionStatus)) {
      throw new ValidationError('Valid transaction status is required', { status: 'Must be PENDING, COMPLETE, or FAILED' });
    }
    
    // Check if account exists
    const account = await prisma.account.findUnique({
      where: { id: accountId }
    });
    
    if (!account) {
      throw new NotFoundError(`Account with ID ${accountId} not found`);
    }
    
    // Normalize the rHash to a consistent format (hex string)
    const normalizedRHash = lndUtils.toHexString(rHash);
    
    // Check if transaction with this rHash already exists
    const existingTransaction = await prisma.lightningTransaction.findUnique({
      where: { rHash: normalizedRHash }
    });
    
    if (existingTransaction) {
      throw new ValidationError('Transaction with this payment hash already exists', { rHash: 'Must be unique' });
    }
    
    // Create the transaction with normalized rHash
    const transaction = await prisma.lightningTransaction.create({
      data: {
        accountId,
        rHash: normalizedRHash,
        amount,
        type,
        status,
        memo
      }
    });
    
    res.status(201).json({ success: true, data: transaction });
  });
  
  /**
   * Get a transaction by rHash
   */
  getTransactionByRHash = asyncHandler(async (req: Request, res: Response) => {
    const { rHash } = req.params as { rHash: string };
    
    const transaction = await prisma.lightningTransaction.findUnique({
      where: { rHash },
      include: { account: true }
    });
    
    if (!transaction) {
      throw new NotFoundError(`Transaction with payment hash ${rHash} not found`);
    }
    
    res.json({ success: true, data: transaction });
  });
  
  /**
   * Update transaction status
   */
  updateTransactionStatus = asyncHandler(async (req: Request, res: Response) => {
    const { rHash } = req.params as { rHash: string };
    const { status } = req.body as { status: TransactionStatus };
    
    const validStatuses: TransactionStatus[] = ['PENDING', 'COMPLETE', 'FAILED'];
    if (!status || !validStatuses.includes(status as TransactionStatus)) {
      throw new ValidationError('Valid transaction status is required', { status: 'Must be PENDING, COMPLETE, or FAILED' });
    }
    
    const transaction = await prisma.lightningTransaction.findUnique({
      where: { rHash }
    });
    
    if (!transaction) {
      throw new NotFoundError(`Transaction with payment hash ${rHash} not found`);
    }
    
    const updatedTransaction = await prisma.lightningTransaction.update({
      where: { rHash },
      data: { status }
    });
    
    res.json({ success: true, data: updatedTransaction });
  });
  
  /**
   * Get all transactions
   */
  getAllTransactions = asyncHandler(async (req: Request, res: Response) => {
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const totalCount = await prisma.lightningTransaction.count();
    
    // Get paginated transactions
    const transactions = await prisma.lightningTransaction.findMany({
      include: { account: true },
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ 
      success: true, 
      data: transactions,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  });
} 