import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware to authenticate API requests using an API key.
 * The API key should be provided in the 'X-API-Key' header.
 * If no API_KEY environment variable is set, authentication is bypassed.
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = process.env.API_KEY;

  // If no API key is configured, skip authentication
  if (!apiKey || apiKey.trim() === '' || apiKey === 'change-me-to-a-secure-api-key') {
    logger.warn('API authentication is disabled. Set API_KEY in .env for security.');
    return next();
  }

  // Get the API key from the request headers
  const requestApiKey = req.headers['x-api-key'];

  // Check if the API key is valid
  if (!requestApiKey || requestApiKey !== apiKey) {
    logger.warn(`Unauthorized API access attempt: ${req.method} ${req.path}`);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing API key'
    });
  }

  // API key is valid, proceed
  next();
}; 