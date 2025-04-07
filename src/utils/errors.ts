/**
 * Base application error class
 */
export class AppError extends Error {
  statusCode: number;
  errors?: Record<string, string>;

  constructor(message: string, statusCode = 500, errors?: Record<string, string>) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
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
 * Error class for validation errors
 */
export class ValidationError extends AppError {
  constructor(message: string, errors?: Record<string, string>) {
    super(message, 400, errors);
  }
}

/**
 * Error class for authentication errors
 */
export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, 401);
  }
}

/**
 * Error class for authorization errors
 */
export class AuthorizationError extends AppError {
  constructor(message: string) {
    super(message, 403);
  }
}

/**
 * Error class for not found errors
 */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
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