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
- **Webhook Notifications**: Support for registering webhook endpoints to receive real-time payment notifications
- **Invoice Subscription**: Built-in polling system to monitor invoice status changes without WebSocket dependencies
- **Account-Specific Operations**: Create invoices and send payments directly from specific accounts
- **Secure Webhook Verification**: HMAC-SHA256 signature verification for webhook payloads

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

The system uses a focused PostgreSQL database with the following tables:

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

### Webhook
```
- id (uuid)
- accountId (foreign key to Account)
- url (string) - endpoint to receive webhook notifications
- secret (string) - secret for signing webhook payloads
- enabled (boolean) - whether the webhook is active
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

### Invoices

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/invoices/incoming` | Create a new invoice for an account |
| POST | `/api/invoices/outgoing` | Send a payment from an account |
| GET | `/api/invoices/status/:rHash` | Check invoice status |
| GET | `/api/invoices/:rHash` | Get invoice by payment hash |
| GET | `/api/invoices/user/:userIdentifier` | Get invoices by user identifier |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks` | Register a new webhook |
| GET | `/api/webhooks` | Get all webhooks |
| GET | `/api/webhooks/:id` | Get webhook by ID |
| PUT | `/api/webhooks/:id` | Update webhook |
| DELETE | `/api/webhooks/:id` | Delete webhook |

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

### Create an invoice for an account
```
POST /api/invoices/incoming
{
  "accountId": "3a7c1e9b-3b2a-4e3f-9c4d-5e6f7a8b9c0d",
  "amount": "1000",
  "memo": "Payment for services"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "invoice": {
      "r_hash": "d45e23cbd4edcabc12c29eb5c3b9c2e1a4b5d6e7f8a9b0c1d2e3f4a5b6c7d8e9",
      "payment_request": "lnbc10u1p3hkng4pp5fpffsrgxp7tpfxhezfvxgvjsd74zj6jn8wm6l39ycnm5crr4mqsdqqcqzpgxqyz5vqsp5hsfy5n97pswkx3uqp5zr5hgqkc4hz7g97anw0hvg8z4rkzcvwuks9qyyssq5g2ff40lf3fnk0k2hxp0cw9xk4ksyauhal3hjvf9n4r898vg4q4d02hlq2js7tpvwpvstmkw22du7y7u6xutkm8fay96cpf4gd0sqea5h49",
      "value": "1000",
      "memo": "Payment for services userid:user123",
      "settled": false
    },
    "transaction": {
      "id": "9c8b7a6f-5e4d-3c2b-1a0f-9e8d7c6b5a4e",
      "accountId": "3a7c1e9b-3b2a-4e3f-9c4d-5e6f7a8b9c0d",
      "rHash": "d45e23cbd4edcabc12c29eb5c3b9c2e1a4b5d6e7f8a9b0c1d2e3f4a5b6c7d8e9",
      "amount": "1000",
      "type": "INCOMING",
      "status": "PENDING",
      "memo": "Payment for services userid:user123",
      "createdAt": "2023-06-25T12:35:56.789Z",
      "updatedAt": "2023-06-25T12:35:56.789Z"
    }
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

### Send a payment from an account
```
POST /api/invoices/outgoing
{
  "accountId": "3a7c1e9b-3b2a-4e3f-9c4d-5e6f7a8b9c0d",
  "paymentRequest": "lnbc10u1p3hkng4pp5fpffsrgxp7tpfxhezfvxgvjsd74zj6jn8wm6l39ycnm5crr4mqsdqqcqzpgxqyz5vqsp5hsfy5n97pswkx3uqp5zr5hgqkc4hz7g97anw0hvg8z4rkzcvwuks9qyyssq5g2ff40lf3fnk0k2hxp0cw9xk4ksyauhal3hjvf9n4r898vg4q4d02hlq2js7tpvwpvstmkw22du7y7u6xutkm8fay96cpf4gd0sqea5h49"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "payment": {
      "payment_hash": "d45e23cbd4edcabc12c29eb5c3b9c2e1a4b5d6e7f8a9b0c1d2e3f4a5b6c7d8e9",
      "payment_preimage": "f0b3f037a2d4a9d0c1d2e3f4a5b6c7d8e9a1b2c3d4e5f6a7b8c9d0e1f2a3b4",
      "value_sat": "1000",
      "value_msat": "1000000",
      "status": "SUCCEEDED"
    },
    "transaction": {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6",
      "accountId": "3a7c1e9b-3b2a-4e3f-9c4d-5e6f7a8b9c0d",
      "rHash": "d45e23cbd4edcabc12c29eb5c3b9c2e1a4b5d6e7f8a9b0c1d2e3f4a5b6c7d8e9",
      "amount": "1000",
      "type": "OUTGOING",
      "status": "COMPLETE",
      "memo": "Purchase from merchant",
      "createdAt": "2023-06-25T12:36:56.789Z",
      "updatedAt": "2023-06-25T12:36:56.789Z"
    }
  }
}
```

### Check invoice status
```
GET /api/invoices/status/d45e23cbd4edcabc12c29eb5c3b9c2e1a4b5d6e7f8a9b0c1d2e3f4a5b6c7d8e9
```

Response:
```json
{
  "success": true,
  "data": {
    "settled": true,
    "status": "COMPLETE"
  }
}
```

### Register a webhook
```
POST /api/webhooks
{
  "accountId": "3a7c1e9b-3b2a-4e3f-9c4d-5e6f7a8b9c0d",
  "url": "https://example.com/webhooks/lightning",
  "secret": "your-webhook-secret"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
    "accountId": "3a7c1e9b-3b2a-4e3f-9c4d-5e6f7a8b9c0d",
    "url": "https://example.com/webhooks/lightning",
    "secret": "your-webhook-secret",
    "enabled": true,
    "createdAt": "2023-06-25T12:37:56.789Z",
    "updatedAt": "2023-06-25T12:37:56.789Z"
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

### Subscription System

LND-DEA uses a polling-based system to monitor invoice status changes rather than WebSockets. This approach:

1. Is more compatible with various deployment environments
2. Doesn't require additional dependencies
3. Works reliably behind proxies and load balancers
4. Automatically retries on connection issues

The polling interval is configurable and defaults to 10 seconds. The system monitors all invoices and triggers appropriate webhooks when statuses change.

Individual applications can also subscribe to specific invoice updates by using the appropriate API endpoints.

### Integrating with Your Application

With the latest enhancements, integrating this double-entry accounting system with your LND-based application is now simpler:

1. **Create Accounts**: Create accounts for users or purposes
2. **Create Invoices**: Generate invoices directly tied to specific accounts
3. **Register Webhooks**: Set up webhooks to receive notifications when payments are made
4. **Send Payments**: Send payments from accounts with automatic balance validation

Example integration using the direct API:

```javascript
// Create an invoice for an account
const invoiceResponse = await fetch('http://localhost:3000/api/invoices/incoming', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key' 
  },
  body: JSON.stringify({
    accountId: '3a7c1e9b-3b2a-4e3f-9c4d-5e6f7a8b9c0d',
    amount: '1000',
    memo: 'Payment for services'
  })
});

const { data } = await invoiceResponse.json();
const paymentRequest = data.invoice.payment_request;

// Send this payment request to the user for payment
// When payment is received, the system will automatically:
// 1. Detect the payment via LND polling
// 2. Update the transaction status in the database
// 3. Send a webhook notification to your application
```

You can also use the traditional approach if you're manually handling invoice creation and just need accounting:

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

### Register a webhook to receive notifications

```javascript
const webhookResponse = await fetch('http://localhost:3000/api/webhooks', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key' 
  },
  body: JSON.stringify({
    accountId: '3a7c1e9b-3b2a-4e3f-9c4d-5e6f7a8b9c0d',
    url: 'https://your-app.com/webhooks/lightning',
    secret: 'your-webhook-secret'
  })
});

// Your application will now receive webhook notifications at the specified URL
// when invoices are created or paid for this account
```

### Testing LND Connectivity

To verify your connection to the LND node is working:

```bash
curl http://localhost:3000/api/lnd/info
```

This will return information about your node if the connection is successful, or an error if there are issues with the connection.

## Webhook Notifications

The system supports webhook notifications for various events related to lightning transactions. When a registered event occurs, the system will send an HTTP POST request to the configured webhook URL with a JSON payload.

### Webhook Events

The following events trigger webhook notifications:

- `invoice.created`: When a new invoice is created for an account
- `invoice.updated`: When an invoice status changes (settled or failed)
- `payment.completed`: When an outgoing payment is completed successfully
- `payment.failed`: When an outgoing payment fails

### Webhook Payload

The webhook payload follows this structure:

```json
{
  "event": "invoice.updated",
  "data": {
    "rHash": "d45e23cbd4edcabc12c29eb5c3b9c2e1a4b5d6e7f8a9b0c1d2e3f4a5b6c7d8e9",
    "accountId": "3a7c1e9b-3b2a-4e3f-9c4d-5e6f7a8b9c0d",
    "amount": "1000",
    "status": "COMPLETE",
    "type": "INCOMING"
  },
  "timestamp": "2023-06-25T12:38:56.789Z"
}
```

### Webhook Security

Each webhook request includes a signature in the `X-Webhook-Signature` header. This signature is an HMAC-SHA256 hash of the request payload, using the webhook secret as the key.

To verify the webhook payload:
1. Take the received payload exactly as-is
2. Create an HMAC-SHA256 hash using your webhook secret
3. Compare the generated hash with the value in the `X-Webhook-Signature` header

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## License

MIT