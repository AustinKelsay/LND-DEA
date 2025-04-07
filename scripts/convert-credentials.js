#!/usr/bin/env node
/**
 * Utility script to convert LND credentials (macaroon and certificate) to the format
 * needed for the LND_MACAROON_PATH and LND_TLS_CERT_PATH environment variables.
 * 
 * Usage:
 *   node convert-credentials.js <path-to-macaroon> <path-to-tls-cert>
 * 
 * Example:
 *   node convert-credentials.js ~/.lnd/data/chain/bitcoin/mainnet/admin.macaroon ~/.lnd/tls.cert
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error('Usage: node convert-credentials.js <path-to-macaroon> <path-to-tls-cert>');
  process.exit(1);
}

const [macaroonPath, tlsCertPath] = args;

// Check if files exist
if (!fs.existsSync(macaroonPath)) {
  console.error(`Macaroon file not found: ${macaroonPath}`);
  process.exit(1);
}

if (!fs.existsSync(tlsCertPath)) {
  console.error(`TLS certificate file not found: ${tlsCertPath}`);
  process.exit(1);
}

// Read and convert files
try {
  // Read macaroon and convert to hex string
  const macaroon = fs.readFileSync(macaroonPath);
  const macaroonHex = macaroon.toString('hex');
  
  // Read TLS cert and convert to base64 string
  const tlsCert = fs.readFileSync(tlsCertPath);
  const tlsCertBase64 = tlsCert.toString('base64');
  
  console.log('\n=== LND Credentials Converted Successfully ===\n');
  console.log('Add these to your .env or .env.docker file:\n');
  console.log(`LND_MACAROON_PATH="${macaroonHex}"`);
  console.log(`LND_TLS_CERT_PATH="${tlsCertBase64}"`);
  console.log('\n===============================================\n');
  
  // Also write to a .env.lnd file for convenience
  const envContent = `# LND credentials converted by convert-credentials.js
# Original paths:
# Macaroon: ${macaroonPath}
# TLS Cert: ${tlsCertPath}
# Generated on: ${new Date().toISOString()}

LND_MACAROON_PATH="${macaroonHex}"
LND_TLS_CERT_PATH="${tlsCertBase64}"
`;

  fs.writeFileSync(path.join(process.cwd(), '.env.lnd'), envContent);
  console.log('These values have also been written to .env.lnd');
  
} catch (error) {
  console.error('Error converting credentials:', error.message);
  process.exit(1);
} 