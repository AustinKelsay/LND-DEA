# Type System

This document describes the type system in the LND Double Entry Accounting project.

## Overview

The project uses TypeScript to provide strong type safety throughout the codebase. Custom type definitions have been created for:

1. LND API responses and requests
2. Bolt11 invoice structures using light-bolt11-decoder
3. Database models via Prisma
4. Application-specific interfaces
5. Error types

## Type Definitions

### LND API Types

The `src/types/lnd-api.d.ts` file contains TypeScript interfaces for LND API responses, including:

- `LndInvoice`: Structure of invoice objects from LND
- `LndRouteHint`: Structure of route hints for invoices
- `LndInvoiceState`: Enum of possible invoice states (OPEN, SETTLED, etc.)
- `LndPaymentResponse`: Structure of payment responses
- `LndPaymentStatus`: Enum of payment statuses
- `LndErrorResponse`: Structure of error responses

These types ensure we correctly parse and handle responses from the LND API.

### Bolt11 Types

The `src/types/light-bolt11-decoder.d.ts` file contains type definitions for the light-bolt11-decoder library:

- `DecodedInvoice`: The structure of a decoded invoice
- `DecodedSection`: Individual sections within a decoded invoice
- `RouteHint`: Type for routing hints
- `FeatureBits`: Types for feature bits in invoices

These types ensure we correctly extract data from Bolt11 invoices.

### Application Interfaces

The `src/models/interfaces.ts` file contains interfaces used throughout the application:

- `ParsedInvoice`: Our application's standardized invoice structure
- `CreateUserInput`: Input for creating users
- `CreateAccountInput`: Input for creating accounts
- `CreateTransactionInput`: Input for creating transactions
- `UserAccountSummary`: Output for account summaries
- `TransactionSummary`: Output for transaction summaries

### Node.js Environment Types

The `src/types/global.d.ts` file extends TypeScript's understanding of the Node.js environment:

- `ProcessEnv`: Defines all environment variables used in the app
- `ErrorConstructor`: Extends the Error constructor with Node.js specific methods

## Benefits

1. **Type Safety**: Catches errors at compile time instead of runtime
2. **IDE Support**: Provides autocomplete and documentation in editors
3. **Self-Documentation**: Makes the codebase more readable and self-documenting
4. **Consistent Structures**: Ensures data structures are consistent across the app
5. **Refactoring Safety**: Makes refactoring safer and easier

## Usage Examples

### Using Type Definitions for LND API

```typescript
// LND invoice is properly typed
async function processInvoice(invoice: LndInvoice) {
  // TypeScript knows all the properties of LndInvoice
  if (invoice.settled) {
    // Process settled invoice
  }
}
```

### Using Parse Function with Strong Types

```typescript
// Parse a Bolt11 invoice with strong typing
const parsedInvoice: ParsedInvoice = parseInvoice(paymentRequest);
```

### Using Type-Safe Database Operations

```typescript
// Create a user with type checking
const user = await dbService.createUser({ 
  username: "example" // TypeScript ensures this matches CreateUserInput
});
```

## Error Types

The error system uses TypeScript for type safety:

```typescript
// Error is typed, so compiler knows it has a statusCode property
const error = new NotFoundError("User not found");
console.log(error.statusCode); // TypeScript knows this exists
``` 