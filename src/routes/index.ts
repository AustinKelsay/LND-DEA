import { Router } from 'express';
import accountRoutes from './accountRoutes';
import transactionRoutes from './transactionRoutes';

const router = Router();

router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);

export default router; 