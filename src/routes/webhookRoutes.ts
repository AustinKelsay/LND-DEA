import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';

const router = Router();
const webhookController = new WebhookController();

// Get all webhooks for an account
router.get('/', webhookController.getWebhooks);

// Get a webhook by ID
router.get('/:id', webhookController.getWebhookById);

// Create a new webhook
router.post('/', webhookController.createWebhook);

// Update a webhook
router.put('/:id', webhookController.updateWebhook);

// Delete a webhook
router.delete('/:id', webhookController.deleteWebhook);

export default router; 