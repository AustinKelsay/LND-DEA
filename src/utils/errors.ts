import { logger } from './logger';

/**
 * Base application error class that extends Error
 */
export class AppError extends Error {
  statusCode: number;
  errors?: Record<string, string>;
  isOperational: boolean;

  constructor(message: string, statusCode = 500, errors?: Record<string, string>) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true; // Indicates if this is an expected error that's handled
    
    // Ensure the proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
    
    // Capture stack trace, excluding the constructor call from the stack
    Error.captureStackTrace(this, this.constructor);
    
    // Log the error automatically when it's created
    this.logError();
  }
  
  /**
   * Log the error details
   */
  logError(): void {
    const logLevel = this.statusCode >= 500 ? 'error' : 'warn';
    logger[logLevel](`${this.name}: ${this.message}`, {
      statusCode: this.statusCode,
      errors: this.errors,
      stack: this.stack
    });
  }
}

/**
 * Error class for invoices
 */
export class InvoiceError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

/**
 * Error class for LND API-related errors
 */
export class LndApiError extends AppError {
  responseData?: any;
  errorCode?: string;

  constructor(message: string, statusCode = 502, errorCode?: string, responseData?: any) {
    super(message, statusCode);
    this.errorCode = errorCode;
    this.responseData = responseData;
  }
}

/**
 * Error class for Bolt11 parsing errors
 */
export class Bolt11ParseError extends AppError {
  paymentRequest: string;

  constructor(message: string, paymentRequest: string, statusCode = 400) {
    super(message, statusCode);
    this.paymentRequest = paymentRequest;
  }
}

/**
 * Error class for database-related errors
 */
export class DatabaseError extends AppError {
  originalError: any;

  constructor(message: string, originalError: any, statusCode = 500) {
    super(message, statusCode);
    this.originalError = originalError;
  }
}

/**
 * 400 Bad Request - Used for validation errors
 */
export class ValidationError extends AppError {
  constructor(message = 'Validation error', errors?: Record<string, string>) {
    super(message, 400, errors);
    this.name = 'ValidationError';
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 401 Unauthorized - Used for authentication errors
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'UnauthorizedError';
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 403 Forbidden - Used for authorization errors
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'ForbiddenError';
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 404 Not Found - Used when a resource is not found
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 409 Conflict - Used for resource conflicts
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', errors?: Record<string, string>) {
    super(message, 409, errors);
    this.name = 'ConflictError';
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 422 Unprocessable Entity - When semantically correct but unable to process
 */
export class UnprocessableEntityError extends AppError {
  constructor(message = 'Unprocessable entity', errors?: Record<string, string>) {
    super(message, 422, errors);
    this.name = 'UnprocessableEntityError';
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, UnprocessableEntityError.prototype);
  }
}

/**
 * 500 Internal Server Error - For unexpected server errors
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500);
    this.name = 'InternalServerError';
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * 502 Bad Gateway - When an upstream service returns an invalid response
 */
export class BadGatewayError extends AppError {
  constructor(message = 'Bad gateway error') {
    super(message, 502);
    this.name = 'BadGatewayError';
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, BadGatewayError.prototype);
  }
}

/**
 * 503 Service Unavailable - When a service is temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503);
    this.name = 'ServiceUnavailableError';
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * 504 Gateway Timeout - When an upstream service times out
 */
export class GatewayTimeoutError extends AppError {
  constructor(message = 'Gateway timeout') {
    super(message, 504);
    this.name = 'GatewayTimeoutError';
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, GatewayTimeoutError.prototype);
  }
}

/**
 * Helper function to handle errors from LND API
 */
export function handleLndApiError(error: any): LndApiError {
  if (error instanceof LndApiError) {
    return error;
  }

  // If it's an HTTP error
  if (error.response) {
    return new LndApiError(
      error.response.data?.error || error.message,
      error.response.status,
      error.response.data?.code || 'LND_API_ERROR',
      error.response.data
    );
  }

  // If it's a network error
  if (error.request) {
    return new LndApiError(
      'Unable to reach LND API',
      500,
      'LND_NETWORK_ERROR',
      { request: error.request }
    );
  }

  // Default error
  return new LndApiError(
    error.message || 'Unknown LND API error',
    500,
    'LND_UNKNOWN_ERROR',
    error
  );
}

/**
 * Helper function to handle errors from database operations
 */
export function handleDatabaseError(error: any): DatabaseError {
  if (error instanceof DatabaseError) {
    return error;
  }

  // Check for Prisma-specific errors
  if (error.code) {
    // Unique constraint error
    if (error.code === 'P2002') {
      return new DatabaseError(
        `Unique constraint violation on field: ${error.meta?.target}`,
        error,
        409
      );
    }

    // Foreign key constraint error
    if (error.code === 'P2003') {
      return new DatabaseError(
        `Foreign key constraint violation`,
        error,
        400
      );
    }

    // Record not found
    if (error.code === 'P2001') {
      return new DatabaseError(
        `Record not found`,
        error,
        404
      );
    }
  }

  // Default database error
  return new DatabaseError(
    error.message || 'Database operation failed',
    error,
    500
  );
} 