import { Router } from 'express';
import accountRoutes from './accountRoutes';
import transactionRoutes from './transactionRoutes';
import invoiceRoutes from './invoiceRoutes';
import webhookRoutes from './webhookRoutes';
import { lndService } from '../services/lndService';

const router = Router();

router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/webhooks', webhookRoutes);

// Add a test endpoint for LND connection
router.get('/lnd/info', async (req, res, next) => {
  try {
    const info = await lndService.getInfo();
    return res.json({ success: true, data: info });
  } catch (error) {
    next(error);
  }
});

export default router; 