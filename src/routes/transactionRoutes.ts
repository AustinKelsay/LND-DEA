import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController';

const router = Router();
const transactionController = new TransactionController();

// Create a new transaction
router.post('/', transactionController.createTransaction);

// Get all transactions
router.get('/', transactionController.getAllTransactions);

// Get transaction by rHash
router.get('/:rHash', transactionController.getTransactionByRHash);

// Update transaction status
router.put('/:rHash/status', transactionController.updateTransactionStatus);

export default router; 