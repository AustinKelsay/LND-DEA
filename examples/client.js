/**
 * Example client for interacting with the Wallet Segregation API
 */
const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://localhost:3000/api';
const API_KEY = process.env.API_KEY || 'your-api-key';

// Helper function for making API requests
async function apiRequest(endpoint, method = 'GET', data = null) {
  const url = `${API_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    ...(data && { body: JSON.stringify(data) })
  };

  console.log(`Making ${method} request to ${url}`);
  
  const response = await fetch(url, options);
  const responseData = await response.json();
  
  if (!response.ok) {
    throw new Error(`API Error: ${responseData.error || 'Unknown error'}`);
  }
  
  return responseData;
}

// Example functions for interacting with the API
async function createAccount(name, description = '') {
  return apiRequest('/accounts', 'POST', { name, description });
}

async function getAccounts() {
  return apiRequest('/accounts');
}

async function getAccountByName(name) {
  return apiRequest(`/accounts/name/${name}`);
}

async function getAccountBalance(accountId) {
  return apiRequest(`/accounts/${accountId}/balance`);
}

async function recordTransaction(accountId, rHash, amount, type = 'INCOMING', status = 'COMPLETE', memo = '') {
  return apiRequest('/transactions', 'POST', {
    accountId, rHash, amount, type, status, memo
  });
}

async function getTransactions(page = 1, limit = 10) {
  return apiRequest(`/transactions?page=${page}&limit=${limit}`);
}

// Example usage flow
async function runExample() {
  try {
    console.log('=== Wallet Segregation API Example Client ===');
    
    // 1. Create an account
    console.log('\n1. Creating new account...');
    const accountResponse = await createAccount('example_user', 'Example user account');
    console.log('Account created:', accountResponse.data);
    
    const accountId = accountResponse.data.id;
    
    // 2. Record a transaction for this account
    console.log('\n2. Recording a transaction...');
    const transactionResponse = await recordTransaction(
      accountId,
      'd45e23cbd4edcabc12c29eb5c3b9c2e1a4b5d6e7f8a9b0c1d2e3f4a5b6c7d8e9',
      '50000',
      'INCOMING',
      'COMPLETE',
      'Example payment'
    );
    console.log('Transaction recorded:', transactionResponse.data);
    
    // 3. Get the account balance
    console.log('\n3. Getting account balance...');
    const balanceResponse = await getAccountBalance(accountId);
    console.log('Account balance:', balanceResponse.data);
    
    // 4. List all accounts
    console.log('\n4. Listing all accounts...');
    const accountsResponse = await getAccounts();
    console.log(`Found ${accountsResponse.data.length} accounts:`);
    accountsResponse.data.forEach(account => {
      console.log(`- ${account.name} (${account.id}): ${account.description}`);
    });
    
    // 5. List all transactions
    console.log('\n5. Listing transactions...');
    const transactionsResponse = await getTransactions();
    console.log(`Found ${transactionsResponse.data.length} transactions`);
    console.log('Pagination info:', transactionsResponse.pagination);
    
    console.log('\n=== Example completed successfully ===');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the example
runExample(); 