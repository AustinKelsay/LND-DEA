# LND Wallet Segregation (LND-WS)

A lightweight solution for segregating funds in a unified Lightning Network Daemon (LND) node. This project allows you to track and manage multiple "virtual wallets" within a single LND instance.

## Problem Statement

Lightning Network nodes typically manage funds as a single wallet, making it difficult to:
- Track funds belonging to different users or purposes
- Keep accounting records for separate business units
- Provide isolated balances for different services sharing a node

This project solves this by providing a minimal database that maps transactions to specific accounts/users while keeping your LND node as the single source of truth for actual transactions.

## Project Scope

This project deliberately keeps a minimal footprint:
- It doesn't duplicate all data from your LND node
- It simply maps transactions to accounts
- It provides a simple API to query transactions by account

## Technical Features

- **TypeScript with Strong Typing**: Full type safety with comprehensive type declarations
- **Robust Error Handling**: Structured error classes with appropriate HTTP status codes
- **Automatic Transaction Detection**: Automatically monitors LND for new invoices and payments
- **Pagination Support**: All list endpoints include pagination for handling large datasets
- **API Key Authentication**: Simple but effective API key authentication
- **Docker Ready**: Easy deployment with Docker Compose
- **Comprehensive Logging**: Structured logging for easy debugging and monitoring

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

## Docker Setup

### Running with Docker Compose

The application can be easily run using Docker Compose, which will set up both the application and the PostgreSQL database:

```bash
# Run the setup script
npm run docker:setup
```

This will:
1. Check for Docker and Docker Compose installation
2. Create a `.env` file if it doesn't exist
3. Ask if you want to start fresh (remove existing containers and data)
4. Build and start the containers
5. Wait for the application to be ready

Once running, you can access the application at http://localhost:3000.

### Docker Environment Configuration

Make sure to configure these environment variables in `.env.docker`:

```
# Database connection for Docker
DATABASE_URL="postgresql://postgres:password@postgres:5432/lnd_wallet_segregation?schema=public"

# LND connection
LND_REST_HOST="your-lnd-node-ip:8080"
LND_MACAROON_PATH="your-macaroon-hex-string"
LND_TLS_CERT_PATH="your-certificate-base64-string"

# API authentication (optional but recommended)
API_KEY="your-secure-api-key"
```

## Installation for Development

### Prerequisites
- Node.js 18 or newer
- PostgreSQL database
- Access to an LND node with REST API enabled

### Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/lnd-wallet-segregation.git
cd lnd-wallet-segregation

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

To integrate this wallet segregation system with your LND-based application:

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
  
  // Record the transaction in our wallet segregation system
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

### Example Client

This repository includes an example client that demonstrates how to interact with the API. To run it:

```bash
# Install dependencies
npm install

# Run the example client
npm run example:client
```

The example client (`examples/client.js`) shows how to:
- Authenticate with the API
- Create an account
- Record a transaction
- Check an account balance

You can use this as a starting point for your own integration.

## License

MIT