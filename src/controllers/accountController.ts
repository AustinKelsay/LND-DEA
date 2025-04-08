import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError, NotFoundError } from '../utils/errors';
import { DbService } from '../services/dbService';

const dbService = new DbService();

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

    const account = await dbService.createAccount({
      name,
      description
    });

    res.status(201).json({ success: true, data: account });
  });

  /**
   * Get all accounts
   */
  getAllAccounts = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '20');
    const accounts = await dbService.getAllAccounts(limit, page);
    res.json({ success: true, data: accounts });
  });

  /**
   * Get account by ID
   */
  getAccountById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const account = await dbService.getAccount(id);
    
    if (!account) {
      throw new NotFoundError(`Account with ID ${id} not found`);
    }
    
    res.json({ success: true, data: account });
  });

  /**
   * Get account by name
   */
  getAccountByName = asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.params;
    
    // Note: Since there's no explicit getAccountByName method, we need to implement alternative logic
    // For example, get all accounts and filter by name
    const allAccounts = await dbService.getAllAccounts();
    const account = allAccounts.accounts.find(acc => acc.name === name);
    
    if (!account) {
      throw new NotFoundError(`Account with name ${name} not found`);
    }
    
    res.json({ success: true, data: account });
  });

  /**
   * Get transactions for an account
   */
  getAccountTransactions = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '20');
    
    // First, check if the account exists
    const account = await dbService.getAccount(id);
    
    if (!account) {
      throw new NotFoundError(`Account with ID ${id} not found`);
    }
    
    // Use the available getTransactionsByAccountId method
    const result = await dbService.getTransactionsByAccountId(id, limit, page);
    
    res.json({
      success: true,
      data: result.transactions,
      pagination: result.pagination
    });
  });

  /**
   * Get account balance
   */
  getAccountBalance = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const accountSummary = await dbService.getAccount(id);
    
    if (!accountSummary) {
      throw new NotFoundError(`Account with ID ${id} not found`);
    }
    
    res.json({ 
      success: true, 
      data: { balance: accountSummary.balance }
    });
  });
} 