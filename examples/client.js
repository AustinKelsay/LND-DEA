/**
 * Example client for LND Wallet Segregation API
 * This demonstrates how to interact with the API to manage accounts and transactions
 */

const fetch = require('node-fetch');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const API_KEY = process.env.API_KEY || 'your-api-key';

/**
 * Make an API request
 */
async function makeRequest(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const jsonResponse = await response.json();
    
    if (!response.ok) {
      throw new Error(`API error: ${jsonResponse.message || response.statusText}`);
    }
    
    return jsonResponse;
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error.message);
    throw error;
  }
}

/**
 * Create a new account
 */
async function createAccount(name, description = '') {
  console.log(`Creating account "${name}"...`);
  const response = await makeRequest('/accounts', 'POST', {
    name,
    description
  });
  
  console.log('Account created:', response.data);
  return response.data;
}

/**
 * Get all accounts
 */
async function getAccounts() {
  console.log('Getting all accounts...');
  const response = await makeRequest('/accounts');
  
  console.log(`Retrieved ${response.data.length} accounts`);
  return response.data;
}

/**
 * Get account by ID
 */
async function getAccount(id) {
  console.log(`Getting account with ID ${id}...`);
  const response = await makeRequest(`/accounts/${id}`);
  
  console.log('Account details:', response.data);
  return response.data;
}

/**
 * Create a new transaction
 */
async function createTransaction(accountId, rHash, amount, type, status, memo = '') {
  console.log(`Creating ${type} transaction for account ${accountId}...`);
  const response = await makeRequest('/transactions', 'POST', {
    accountId,
    rHash,
    amount,
    type,
    status,
    memo
  });
  
  console.log('Transaction created:', response.data);
  return response.data;
}

/**
 * Get account balance
 */
async function getAccountBalance(accountId) {
  console.log(`Getting balance for account ${accountId}...`);
  const response = await makeRequest(`/accounts/${accountId}/balance`);
  
  console.log('Account balance:', response.data);
  return response.data;
}

/**
 * Run the example
 */
async function runExample() {
  try {
    // 1. Create a test account
    const account = await createAccount('example_user', 'Example Account for Testing');
    
    // 2. Create an incoming transaction
    const incomingTx = await createTransaction(
      account.id,
      `incoming_${Date.now().toString(16)}`, // Generate a unique rHash
      '5000', // 5000 satoshis
      'INCOMING',
      'COMPLETE',
      'Example incoming payment'
    );
    
    // 3. Create an outgoing transaction
    const outgoingTx = await createTransaction(
      account.id,
      `outgoing_${Date.now().toString(16)}`, // Generate a unique rHash
      '2000', // 2000 satoshis
      'OUTGOING',
      'COMPLETE',
      'Example outgoing payment'
    );
    
    // 4. Check the account balance
    await getAccountBalance(account.id);
    
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Run the example if executed directly
if (require.main === module) {
  console.log('Starting LND Wallet Segregation API example...');
  runExample()
    .then(() => console.log('Example completed successfully'))
    .catch(err => console.error('Example failed:', err));
} 