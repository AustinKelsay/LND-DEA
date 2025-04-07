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

## Features

- Map LND transactions to specific accounts
- Track incoming and outgoing payments by account
- Query balance and transaction history by account
- Simple REST API for integration with other services

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

### Recommended Practices

1. **Use Unique Account Names**: Give each account a unique, descriptive name
2. **Record Transactions Promptly**: Record transactions as soon as they're confirmed in LND
3. **Implement Appropriate Access Controls**: Secure your API with authentication mechanisms
4. **Regular Balance Reconciliation**: Periodically verify that your segregated balances match the LND total

## LND Integration Details

This section explains how the application monitors and interacts with your LND node.

### Automatic Transaction Monitoring

The application includes an `LndMonitorService` that automatically detects and records transactions:

1. **Invoice Detection**: The service polls your LND node's invoices endpoint at regular intervals to find settled invoices (incoming payments).

2. **Payment Detection**: Similarly, it monitors the payments endpoint to track outgoing payments made by your node.

3. **Account Assignment**: When a new transaction is detected, the service:
   - Examines the invoice/payment memo for account identifiers
   - Tries to match account names mentioned in the memo
   - Uses a pattern-matching approach via the USER_IDENTIFIER_PATTERN env variable
   - Falls back to a default account when no match is found (automatically created if needed)

4. **Status Updates**: For transactions already recorded with a PENDING status, the service will update them to COMPLETE when settled.

### LND REST API Integration

The application uses LND's REST API for all communication:

- **Authentication**: Uses macaroon-based authentication as specified in your `.env` file
- **TLS Certificate**: Supports custom TLS certificates for secure communication
- **Endpoints Used**:
  - `/v1/getinfo` - To verify connection to LND
  - `/v1/invoices` - To retrieve invoices and detect incoming payments
  - `/v1/payments` - To retrieve payments and detect outgoing transactions
  - `/v1/payreq` - To decode payment requests and extract metadata

### Working with Lightning Payment Hashes

LND may return payment hashes (r_hash) in different formats:

1. **Buffer objects**: Binary data that needs to be converted to a hex string
2. **Base64 strings**: Need to be properly decoded and converted
3. **Hex strings**: Already in the format we need for storage

The application includes utilities in the `lndUtils` module to handle these conversions consistently:

```javascript
// Convert any r_hash format to a consistent hex string
const hexString = lndUtils.toHexString(invoice.r_hash);
```

This ensures that when you store transaction references, they're always in a consistent format that can be used for lookups later.

### Manual Integration

While the automatic monitoring system is provided, you can also manually record transactions:

```javascript
// Example: Manually record a transaction when an invoice is paid
lnd.subscribeInvoices().on('invoice_paid', async (invoice) => {
  // Get the invoice details from LND
  const invoiceDetails = await lnd.lookupInvoice({ r_hash: invoice.r_hash });
  
  // Determine account based on your application logic
  const accountId = getAccountIdFromInvoice(invoiceDetails);
  
  // Record the transaction via the API
  await fetch('http://localhost:3000/api/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your-api-key'
    },
    body: JSON.stringify({
      accountId,
      rHash: invoiceDetails.r_hash_str || (typeof invoiceDetails.r_hash === 'object' 
        ? Buffer.from(invoiceDetails.r_hash).toString('hex')
        : invoiceDetails.r_hash),
      amount: invoiceDetails.value.toString(),
      type: 'INCOMING',
      status: 'COMPLETE',
      memo: invoiceDetails.memo
    })
  });
});
```

## Best Practices for LND Integration

1. **Handle Buffer Data Carefully**: LND often returns binary data (like payment hashes) as Buffer objects. Always convert these to hex strings consistently.

2. **Use Error Handling**: The LND API can return various errors. Wrap calls in try/catch and use the `LndApiError` class to standardize error handling.

3. **Handle Connection Issues Gracefully**: Network issues can occur. Implement reconnection logic and don't crash your application when LND is temporarily unavailable.

4. **Monitor Payment Status Changes**: Some payments might be in a PENDING state initially. Set up monitoring to update their status when they're confirmed.

5. **Keep Consistent Formats**: Ensure that values like payment hashes and amounts are stored in consistent formats (hex strings for hashes, string representation for satoshi amounts).

## Troubleshooting

### Common LND Connection Issues

1. **Connection Refused**: Verify your LND node is running and the REST API is enabled and listening on the configured port.

2. **Authentication Failures**: Check that your macaroon has the required permissions and is correctly formatted.

3. **TLS Certificate Issues**: If using a self-signed certificate, ensure it's correctly loaded by the application.

4. **Parsing Errors**: If you see "Failed to parse LND response" errors, check that the LND API hasn't changed its response format in a newer version.

### Common Issues

1. **Connection to LND Failed**: Verify your LND node is running and that the credentials in your `.env` file are correct.

2. **Transaction Not Associated with Account**: Ensure you're correctly identifying the account for each transaction based on your business logic.

3. **Balance Discrepancies**: If account balances don't match expected values:
   - Check for missing transactions
   - Verify transaction types (INCOMING/OUTGOING) are correctly assigned
   - Check for transactions with PENDING status that should be updated

### Prisma Database Issues

If you encounter database connection issues:

```bash
# Reset the database (caution: this will delete all data)
npx prisma migrate reset

# Update the database schema if you've made changes
npx prisma db push

# Inspect the database with Prisma Studio
npx prisma studio
```

## License

MIT