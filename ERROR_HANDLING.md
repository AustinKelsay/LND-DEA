# Error Handling System

This document describes the error handling system in the LND Double Entry Accounting project.

## Overview

The system uses a custom error handling approach that:

1. Creates specific error types for different scenarios
2. Centralizes error handling in Express middleware
3. Provides consistent error responses to clients
4. Categorizes errors properly for debugging

## Custom Error Types

The system extends JavaScript's built-in `Error` class with the following custom error types:

- `AppError`: Base class for all application errors
- `InvoiceError`: For invoice-related errors
- `LndApiError`: For LND API-related errors
- `Bolt11ParseError`: For Bolt11 invoice parsing errors
- `DatabaseError`: For database-related errors
- `ValidationError`: For request validation errors
- `AuthenticationError`: For authentication-related errors
- `AuthorizationError`: For authorization-related errors
- `NotFoundError`: For resource not found errors

## Error Response Format

All errors return a consistent JSON response with the following structure:

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "status": 400,
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

Fields:
- `message`: Human-readable error message
- `status`: HTTP status code
- `code`: Machine-readable error code
- `details`: Additional error details (only included in certain error types)

## Middleware

The error handling middleware:

1. Captures all errors thrown in the application
2. Formats them into consistent response objects
3. Sets the appropriate HTTP status code
4. Adds details based on the error type
5. Logs errors in development mode

## Error Handlers

Special helper functions are available to handle specific error sources:

- `handleLndApiError`: For converting LND API errors
- `handleDatabaseError`: For converting database errors

## Usage Examples

### Throwing a validation error
```typescript
if (!username) {
  throw new ValidationError('Username is required', { username: 'Username is required' });
}
```

### Throwing a not found error
```typescript
const user = await dbService.getUserById(id);
if (!user) {
  throw new NotFoundError(`User with ID ${id} not found`);
}
```

### Using async handler
```typescript
const getUser = asyncHandler(async (req, res) => {
  // This code is automatically wrapped in try/catch
  const user = await userService.getUser(req.params.id);
  res.json(user);
});
```

## Error Logging

In development mode, all errors are logged to the console with their stack traces.
In production mode, only non-operational errors (those not created by our error classes) are logged.

This helps filter out expected errors (like validation errors) while still capturing unexpected issues. 