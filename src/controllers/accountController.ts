import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError, NotFoundError } from '../utils/errors';

const prisma = new PrismaClient();

/**
 * Account controller for handling account-related requests
 */
export class AccountController {
  /**
   * Create a new account
   */
  createAccount = asyncHandler(async (req: Request, res: Response) => {
    const { name, description } = req.body as { name: string; description?: string };
    
    if (!name) {
      throw new ValidationError('Account name is required', { name: 'Account name is required' });
    }

    const account = await prisma.account.create({
      data: {
        name,
        description
      }
    });

    res.status(201).json({ success: true, data: account });
  });

  /**
   * Get all accounts
   */
  getAllAccounts = asyncHandler(async (req: Request, res: Response) => {
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const totalCount = await prisma.account.count();
    
    // Get paginated accounts
    const accounts = await prisma.account.findMany({
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ 
      success: true, 
      data: accounts,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  });

  /**
   * Get account by ID
   */
  getAccountById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    
    const account = await prisma.account.findUnique({
      where: { id }
    });
    
    if (!account) {
      throw new NotFoundError(`Account with ID ${id} not found`);
    }
    
    res.json({ success: true, data: account });
  });

  /**
   * Get account by name
   */
  getAccountByName = asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.params as { name: string };
    
    const account = await prisma.account.findUnique({
      where: { name }
    });
    
    if (!account) {
      throw new NotFoundError(`Account with name ${name} not found`);
    }
    
    res.json({ success: true, data: account });
  });

  /**
   * Get transactions for an account
   */
  getAccountTransactions = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    // Check if account exists
    const accountExists = await prisma.account.findUnique({
      where: { id },
      select: { id: true }
    });
    
    if (!accountExists) {
      throw new NotFoundError(`Account with ID ${id} not found`);
    }

    // Get total count of transactions for this account
    const totalCount = await prisma.lightningTransaction.count({
      where: { accountId: id }
    });
    
    // Get paginated transactions
    const transactions = await prisma.lightningTransaction.findMany({
      where: { accountId: id },
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

  /**
   * Get account balance
   */
  getAccountBalance = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    
    const account = await prisma.account.findUnique({
      where: { id },
      include: { transactions: true }
    });
    
    if (!account) {
      throw new NotFoundError(`Account with ID ${id} not found`);
    }
    
    // Calculate balance by summing incoming and subtracting outgoing
    const balance = account.transactions
      .filter(tx => tx.status === 'COMPLETE') // Only include COMPLETE transactions
      .reduce((sum, tx) => {
      const amount = BigInt(tx.amount);
      
      if (tx.type === 'INCOMING') {
        return sum + amount;
      } else {
        return sum - amount;
      }
    }, BigInt(0));
    
    res.json({ 
      success: true, 
      data: { 
        accountId: id, 
        balance: balance.toString(),
        name: account.name
      } 
    });
  });
} 