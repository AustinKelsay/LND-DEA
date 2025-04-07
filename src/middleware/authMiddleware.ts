import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware to authenticate API requests using API key
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = process.env.API_KEY;
  
  // If no API key is set in environment, disable authentication
  if (!apiKey) {
    logger.warn('API_KEY is not set in environment. Authentication is disabled.');
    return next();
  }
  
  // Skip authentication for health check endpoint
  if (req.path === '/health') {
    return next();
  }
  
  // Get API key from request header
  const requestApiKey = req.header('X-API-Key');
  
  // Verify API key
  if (!requestApiKey || requestApiKey !== apiKey) {
    logger.warn(`Unauthorized API request from ${req.ip} to ${req.path}`);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Valid API key required.'
    });
  }
  
  // Authentication successful
  next();
}; 