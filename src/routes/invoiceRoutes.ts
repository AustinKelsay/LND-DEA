import { Router } from 'express';
import { InvoiceController } from '../controllers/invoiceController';

const router = Router();
const invoiceController = new InvoiceController();

// Process an incoming invoice
router.post('/incoming', invoiceController.processIncomingInvoice);

// Process an outgoing payment
router.post('/outgoing', invoiceController.processOutgoingPayment);

// Settle an invoice
router.post('/settle/:rHash', invoiceController.settleInvoice);

// Get an invoice by payment hash
router.get('/:rHash', invoiceController.getInvoiceByRHash);

// Get invoices by user identifier
router.get('/user/:userIdentifier', invoiceController.getInvoicesByUserIdentifier);

export default router; 