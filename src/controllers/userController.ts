import { Request, Response } from 'express';
import { DbService } from '../services/dbService';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError } from '../utils/errors';

const dbService = new DbService();

/**
 * User controller for handling user-related requests
 */
export class UserController {
  /**
   * Create a new user
   */
  createUser = asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.body;
    
    if (!username) {
      throw new ValidationError('Username is required', { username: 'Username is required' });
    }

    const existingUser = await dbService.getUserByUsername(username);
    if (existingUser) {
      throw new ValidationError('Username already exists', { username: 'Username already exists' });
    }

    const user = await dbService.createUser({ username });
    res.status(201).json({ success: true, data: user });
  });

  /**
   * Get a user by ID
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await dbService.getUserById(id);
    
    res.json({ success: true, data: user });
  });

  /**
   * Get a user by username
   */
  getUserByUsername = asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.params;
    const user = await dbService.getUserByUsername(username);
    
    res.json({ success: true, data: user });
  });

  /**
   * Get all users
   */
  getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const users = await dbService.getAllUsers();
    res.json({ success: true, data: users });
  });

  /**
   * Get user account summary
   */
  getUserAccountSummary = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const summary = await dbService.getUserAccountSummary(id);
    res.json({ success: true, data: summary });
  });
} 