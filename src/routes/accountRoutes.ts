import { Router } from 'express';
import { AccountController } from '../controllers/accountController';

const router = Router();
const accountController = new AccountController();

// Create a new account
router.post('/', accountController.createAccount);

// Get all accounts
router.get('/', accountController.getAllAccounts);

// Get account by name - MUST come before the ID route to avoid capture
router.get('/name/:name', accountController.getAccountByName);

// Get account by ID
router.get('/:id', accountController.getAccountById);

// Get transactions for an account
router.get('/:id/transactions', accountController.getAccountTransactions);

// Get account balance
router.get('/:id/balance', accountController.getAccountBalance);

export default router; 