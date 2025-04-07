import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Wrapper for async route handlers to catch errors
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Handler for 404 Not Found errors
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Global error handling middleware
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Default error values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: Record<string, string> | undefined = undefined;
  
  // Log the error
  logger.error(`${req.method} ${req.path} - Error:`, {
    message: err.message,
    stack: err.stack,
    status: err instanceof AppError ? err.statusCode : 500
  });
  
  // Handle AppError derived errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } 
  // Handle Prisma errors
  else if (err.name === 'PrismaClientKnownRequestError') {
    statusCode = 400;
    message = 'Database operation failed';
  } 
  // Handle validation errors from Express validator (if used)
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  }
  // Handle SyntaxError (e.g., malformed JSON)
  else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    message = 'Invalid request body';
  }

  // Send the response
  res.status(statusCode).json({
    success: false,
    error: message,
    errors,
    // Include stack trace only in development mode
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}; 