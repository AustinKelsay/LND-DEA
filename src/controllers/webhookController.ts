import { Request, Response } from 'express';
import { DbService } from '../services/dbService';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError, NotFoundError } from '../utils/errors';

const dbService = new DbService();

/**
 * Webhook controller for handling webhook-related requests
 */
export class WebhookController {
  /**
   * Get all webhooks (optionally filtered by accountId)
   */
  getWebhooks = asyncHandler(async (req: Request, res: Response) => {
    const { accountId } = req.query as { accountId?: string };
    
    let webhooks;
    if (accountId) {
      webhooks = await dbService.getWebhooksByAccountId(accountId);
    } else {
      // To prevent accidentally exposing all webhooks, this requires an accountId
      throw new ValidationError('Account ID is required', { accountId: 'Account ID is required' });
    }
    
    res.json({ success: true, data: webhooks });
  });

  /**
   * Get a webhook by ID
   */
  getWebhookById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const webhook = await dbService.getWebhookById(id);
    
    if (!webhook) {
      throw new NotFoundError(`Webhook with ID ${id} not found`);
    }
    
    res.json({ success: true, data: webhook });
  });

  /**
   * Create a new webhook
   */
  createWebhook = asyncHandler(async (req: Request, res: Response) => {
    const { accountId, url, secret, enabled } = req.body as { 
      accountId: string;
      url: string; 
      secret?: string;
      enabled?: boolean;
    };
    
    if (!accountId) {
      throw new ValidationError('Account ID is required', { accountId: 'Account ID is required' });
    }
    
    if (!url) {
      throw new ValidationError('URL is required', { url: 'URL is required' });
    }
    
    try {
      // Validate URL by attempting to create a URL object
      new URL(url);
    } catch (error) {
      throw new ValidationError('Invalid URL format', { url: 'Invalid URL format' });
    }
    
    const webhook = await dbService.createWebhook({
      accountId,
      url,
      secret: secret || '',
      enabled
    });
    
    res.status(201).json({ success: true, data: webhook });
  });

  /**
   * Update a webhook
   */
  updateWebhook = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { url, secret, enabled } = req.body as { 
      url?: string; 
      secret?: string;
      enabled?: boolean;
    };
    
    // At least one field must be updated
    if (url === undefined && secret === undefined && enabled === undefined) {
      throw new ValidationError('At least one field must be updated', { 
        fields: 'At least one of: url, secret, enabled must be provided' 
      });
    }
    
    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
      } catch (error) {
        throw new ValidationError('Invalid URL format', { url: 'Invalid URL format' });
      }
    }
    
    const updateData: Record<string, any> = {};
    if (url !== undefined) updateData.url = url;
    if (secret !== undefined) updateData.secret = secret;
    if (enabled !== undefined) updateData.enabled = enabled;
    
    const webhook = await dbService.updateWebhook(id, updateData);
    
    res.json({ success: true, data: webhook });
  });

  /**
   * Delete a webhook
   */
  deleteWebhook = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const success = await dbService.deleteWebhook(id);
    
    if (!success) {
      throw new NotFoundError(`Webhook with ID ${id} not found`);
    }
    
    res.json({ success: true, message: `Webhook ${id} deleted successfully` });
  });
} 