# LND Double Entry Accounting (LND-DEA)

A lightweight solution for managing double-entry accounting in a unified Lightning Network Daemon (LND) node. This project allows you to track and manage financial transactions with proper accounting principles within a single LND instance.

## Problem Statement

Lightning Network nodes typically manage funds as a single wallet, making it difficult to:
- Track funds belonging to different users or purposes
- Keep accounting records for separate business units
- Provide isolated balances for different services sharing a node

This project solves this by providing a minimal double-entry accounting database that maps transactions to specific accounts/users while keeping your LND node as the single source of truth for actual transactions.

## Project Scope

This project deliberately keeps a minimal footprint:
- It doesn't duplicate all data from your LND node
- It implements proper double-entry accounting for LND transactions
- It provides a simple API to query transactions by account

## Technical Features

- **TypeScript with Strong Typing**: Full type safety with comprehensive type declarations
- **Robust Error Handling**: Structured error classes with appropriate HTTP status codes
- **Automatic Transaction Detection**: Automatically monitors LND for new invoices and payments
- **Pagination Support**: All list endpoints include pagination for handling large datasets
- **API Key Authentication**: Simple but effective API key authentication
- **Docker Ready**: Easy deployment with Docker Compose
- **Comprehensive Logging**: Structured logging for easy debugging and monitoring
- **LND Connectivity Testing**: Endpoint to verify LND node connection status

## Type System

The project uses TypeScript to provide strong type safety throughout the codebase. Custom type definitions have been created for:

1. LND API responses and requests
2. Bolt11 invoice structures using light-bolt11-decoder
3. Database models via Prisma
4. Application-specific interfaces
5. Error types
6. Node.js built-in modules and Buffer

### Type Definitions

#### LND API Types

The `src/types/lnd-api.d.ts` file contains TypeScript interfaces for LND API responses, including:

- `LndInvoice`: Structure of invoice objects from LND
- `LndRouteHint`: Structure of route hints for invoices
- `LndInvoiceState`: Enum of possible invoice states (OPEN, SETTLED, etc.)
- `LndPaymentResponse`: Structure of payment responses
- `LndPaymentStatus`: Enum of payment statuses
- `LndErrorResponse`: Structure of error responses
- `LndInfo`: Structure of LND node information

These types ensure we correctly parse and handle responses from the LND API.

#### Bolt11 Types

The `src/types/light-bolt11-decoder.d.ts` file contains type definitions for the light-bolt11-decoder library:

- `DecodedInvoice`: The structure of a decoded invoice
- `DecodedSection`: Individual sections within a decoded invoice
- `RouteHint`: Type for routing hints
- `FeatureBits`: Types for feature bits in invoices

These types ensure we correctly extract data from Bolt11 invoices.

#### Application Interfaces

The `src/models/interfaces.ts` file contains interfaces used throughout the application:

- `ParsedInvoice`: Our application's standardized invoice structure
- `CreateUserInput`: Input for creating users
- `CreateAccountInput`: Input for creating accounts
- `CreateTransactionInput`: Input for creating transactions
- `UserAccountSummary`: Output for account summaries
- `TransactionSummary`: Output for transaction summaries

#### Node.js Environment Types

The `src/types/global.d.ts` file extends TypeScript's understanding of the Node.js environment:

- `ProcessEnv`: Defines all environment variables used in the app
- `ErrorConstructor`: Extends the Error constructor with Node.js specific methods
- `Buffer`: Complete definition of the Node.js Buffer class
- `Module declarations`: For Node.js modules like 'fs', 'http', 'https', and '@prisma/client'

#### HTTP Types

We use the built-in `http` module to properly type HTTP responses:

- `IncomingMessage`: Used to type HTTP responses in the LND service

### Benefits of Type System

1. **Type Safety**: Catches errors at compile time instead of runtime
2. **IDE Support**: Provides autocomplete and documentation in editors
3. **Self-Documentation**: Makes the codebase more readable and self-documenting
4. **Consistent Structures**: Ensures data structures are consistent across the app
5. **Refactoring Safety**: Makes refactoring safer and easier

### Type System Usage Examples

#### Using Type Definitions for LND API

```typescript
// LND invoice is properly typed
async function processInvoice(invoice: LndInvoice) {
  // TypeScript knows all the properties of LndInvoice
  if (invoice.settled) {
    // Process settled invoice
  }
}
```

#### Using Parse Function with Strong Types

```typescript
// Parse a Bolt11 invoice with strong typing
const parsedInvoice: ParsedInvoice = parseInvoice(paymentRequest);
```

#### Using Type-Safe Database Operations

```typescript
// Create a user with type checking
const user = await dbService.createUser({ 
  username: "example" // TypeScript ensures this matches CreateUserInput
});
```

#### HTTP Request Handling with Types

```typescript
// Properly typed HTTP response
const req = https.request(options, (res: IncomingMessage) => {
  let data = '';
  
  res.on('data', (chunk: Buffer) => {
    data += chunk;
  });

  // Rest of the code...
});
```

## Error Handling System

The system uses a custom error handling approach that:

1. Creates specific error types for different scenarios
2. Centralizes error handling in Express middleware
3. Provides consistent error responses to clients
4. Categorizes errors properly for debugging
5. Handles LND API errors with specific status codes and details

### Custom Error Types

The system extends JavaScript's built-in `Error` class with the following custom error types:

- `AppError`: Base class for all application errors
- `InvoiceError`: For invoice-related errors
- `LndApiError`: For LND API-related errors, including status code and response data
- `Bolt11ParseError`: For Bolt11 invoice parsing errors
- `DatabaseError`: For database-related errors
- `ValidationError`: For request validation errors
- `AuthenticationError`: For authentication-related errors
- `AuthorizationError`: For authorization-related errors
- `NotFoundError`: For resource not found errors

### Error Response Format

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

### Error Middleware

The error handling middleware:

1. Captures all errors thrown in the application
2. Formats them into consistent response objects
3. Sets the appropriate HTTP status code
4. Adds details based on the error type
5. Logs errors in development mode

### Error Handlers

Special helper functions are available to handle specific error sources:

- `handleLndApiError`: For converting LND API errors
- `handleDatabaseError`: For converting database errors

### LND API Error Handling

The system includes specific handling for LND API errors:

```typescript
export class LndApiError extends Error {
  statusCode: number;
  responseData?: string;

  constructor(message: string, statusCode: number, responseData?: string) {
    super(message);
    this.name = 'LndApiError';
    this.statusCode = statusCode;
    this.responseData = responseData;
  }
}
```

This specialized error class captures:
- The HTTP status code from the LND API
- The raw response data for debugging
- A descriptive error message

### Error Handling Usage Examples

#### Throwing a validation error
```typescript
if (!username) {
  throw new ValidationError('Username is required', { username: 'Username is required' });
}
```

#### Throwing a not found error
```typescript
const user = await dbService.getUserById(id);
if (!user) {
  throw new NotFoundError(`User with ID ${id} not found`);
}
```

#### Handling LND API errors
```typescript
try {
  await lndService.makeRequest('GET', 'getinfo');
} catch (error) {
  if (error instanceof LndApiError) {
    console.error(`LND API error: ${error.statusCode} - ${error.message}`);
    // Handle specific error codes
    if (error.statusCode === 401) {
      // Handle authentication error
    }
  }
  throw error;
}
```

#### Using async handler
```typescript
const getUser = asyncHandler(async (req, res) => {
  // This code is automatically wrapped in try/catch
  const user = await userService.getUser(req.params.id);
  res.json(user);
});
```

### Error Logging

In development mode, all errors are logged to the console with their stack traces.
In production mode, only non-operational errors (those not created by our error classes) are logged.

This helps filter out expected errors (like validation errors) while still capturing unexpected issues.

## Database Schema

The system uses a focused PostgreSQL database with only two tables:

### Account
```
- id (uuid)
- name (string, unique)
- description (string, optional)
- createdAt (timestamp)
- updatedAt (timestamp)
```

### LightningTransaction
```
- id (uuid)
- accountId (foreign key to Account)
- rHash (string) - payment hash from LND
- amount (string) - satoshi amount as string to handle large values
- type (enum: 'INCOMING'|'OUTGOING')
- status (enum: 'PENDING'|'COMPLETE'|'FAILED')
- memo (string, optional)
- createdAt (timestamp)
- updatedAt (timestamp)
```

## API Endpoints

### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/accounts` | Create a new account |
| GET | `/api/accounts` | Get all accounts |
| GET | `/api/accounts/name/:name` | Get account by name |
| GET | `/api/accounts/:id` | Get account by ID |
| GET | `/api/accounts/:id/transactions` | Get transactions for an account |
| GET | `/api/accounts/:id/balance` | Get account balance |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transactions` | Create a new transaction |
| GET | `/api/transactions` | Get all transactions |
| GET | `/api/transactions/:rHash` | Get transaction by rHash |
| PUT | `/api/transactions/:rHash/status` | Update transaction status |

### LND Info

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lnd/info` | Get LND node connection information |

### Pagination

All list endpoints (GET `/api/accounts`, GET `/api/transactions`, GET `/api/accounts/:id/transactions`) support pagination with the following query parameters:

- `page`: Page number (default: 1)
- `limit`: Number of items per page (default: 20)

Example:
```
GET /api/transactions?page=2&limit=10
```

Response includes pagination metadata:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 45,
    "page": 2,
    "limit": 10,
    "pages": 5
  }
}
```

## API Usage Examples

### Create a new account
```
POST /api/accounts
{
  "name": "user123",
  "description": "Optional description"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "3a7c1e9b-3b2a-4e3f-9c4d-5e6f7a8b9c0d",
    "name": "user123",
    "description": "Optional description",
    "createdAt": "2023-06-25T12:34:56.789Z",
    "updatedAt": "2023-06-25T12:34:56.789Z"
  }
}
```

### Associate a transaction with an account
```
POST /api/transactions
{
  "accountId": "3a7c1e9b-3b2a-4e3f-9c4d-5e6f7a8b9c0d",
  "rHash": "d45e23cbd4edcabc12c29eb5c3b9c2e1a4b5d6e7f8a9b0c1d2e3f4a5b6c7d8e9",
  "amount": "1000",
  "type": "INCOMING",
  "status": "COMPLETE",
  "memo": "Payment for services"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "9c8b7a6f-5e4d-3c2b-1a0f-9e8d7c6b5a4e",
    "accountId": "3a7c1e9b-3b2a-4e3f-9c4d-5e6f7a8b9c0d",
    "rHash": "d45e23cbd4edcabc12c29eb5c3b9c2e1a4b5d6e7f8a9b0c1d2e3f4a5b6c7d8e9",
    "amount": "1000",
    "type": "INCOMING",
    "status": "COMPLETE",
    "memo": "Payment for services",
    "createdAt": "2023-06-25T12:35:56.789Z",
    "updatedAt": "2023-06-25T12:35:56.789Z"
  }
}
```

### Get account balance
```
GET /api/accounts/3a7c1e9b-3b2a-4e3f-9c4d-5e6f7a8b9c0d/balance
```

Response:
```json
{
  "success": true,
  "data": {
    "accountId": "3a7c1e9b-3b2a-4e3f-9c4d-5e6f7a8b9c0d",
    "balance": "1000",
    "name": "user123"
  }
}
```

### Check LND node status
```
GET /api/lnd/info
```

Response:
```json
{
  "success": true,
  "data": {
    "version": "0.18.0-beta",
    "identity_pubkey": "0369bbfcb51806cab960301489c37e98e74a38f83a874d0ce0e57f5d8cc9052394",
    "alias": "plebdevs-test",
    "color": "#ff5000",
    "num_active_channels": 3,
    "synced_to_chain": true,
    "block_height": 2004941,
    "chains": [{"chain": "bitcoin", "network": "signet"}],
    "features": {...}
  }
}
```

## Docker Setup

### Running with Docker Compose

The application can be easily run using Docker Compose, which will set up both the application and the PostgreSQL database:

```bash
# Build and start Docker containers
docker-compose build
docker-compose up -d
```

This will:
1. Build the Docker image
2. Start the PostgreSQL and application containers
3. Initialize the database schema
4. Start the application

Once running, you can access the application at http://localhost:3000.

### Environment Configuration

The application uses a single `.env` file for configuration. When running with Docker, the database connection is automatically configured to use the Docker service name.

Example `.env` file:

```
# Database connection - for local development
# Docker overrides this to use the postgres service
DATABASE_URL="postgresql://postgres:password@localhost:5433/lnd_double_entry_accounting?schema=public"

# LND connection
LND_REST_HOST="your-lnd-node:8080"
LND_MACAROON_PATH="your-macaroon-hex-string"
LND_TLS_CERT_PATH="your-certificate-base64-string"

# Optional: User identification pattern
USER_IDENTIFIER_PATTERN="userid:([a-zA-Z0-9]+)"

# API authentication (optional but recommended)
API_KEY="your-secure-api-key"

# Server
PORT=3000
NODE_ENV=development
```

## Installation for Development

### Prerequisites
- Node.js 18 or newer
- PostgreSQL database
- Access to an LND node with REST API enabled

### Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/lnd-double-entry-accounting.git
cd lnd-double-entry-accounting

# Install dependencies
npm install

# Create .env file
cp .env.sample .env
# Edit .env file with your configuration

# Generate Prisma client
npm run generate

# Run Prisma migrations
npm run migrate:dev

# Build TypeScript
npm run build

# Start the server
npm start
```

## Implementation & Integration

### Authentication

The API is protected with a simple API key authentication system. To make requests:

1. Set the `API_KEY` environment variable in your `.env` file
2. Include this key in the `X-API-Key` header with every request:

```bash
curl -H "X-API-Key: your-secure-api-key" http://localhost:3000/api/accounts
```

If no API_KEY is set in the environment, authentication will be disabled with a warning.

### Integrating with Your Application

To integrate this double-entry accounting system with your LND-based application:

1. **Listen for LND Payments**: Use LND's gRPC or REST API to subscribe to payment events
2. **Determine Account Ownership**: Use your application logic to determine which account a payment belongs to
3. **Record the Transaction**: Call this API to record the transaction in the correct account

Example integration pseudocode:
```javascript
// When an invoice is paid in LND
lnd.subscribeInvoices().on('invoice_paid', async (invoice) => {
  // Determine which account this payment belongs to
  // e.g., from custom fields in the invoice memo
  const accountId = determineAccountFromInvoice(invoice);
  
  // Record the transaction in our double-entry accounting system
  await fetch('http://localhost:3000/api/transactions', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-API-Key': 'your-api-key' 
    },
    body: JSON.stringify({
      accountId,
      rHash: invoice.r_hash.toString('hex'),
      amount: invoice.value.toString(),
      type: 'INCOMING',
      status: 'COMPLETE',
      memo: invoice.memo
    })
  });
});
```

### Testing LND Connectivity

To verify your connection to the LND node is working:

```bash
curl http://localhost:3000/api/lnd/info
```

This will return information about your node if the connection is successful, or an error if there are issues with the connection.

## License

MIT