/**
 * TypeScript definitions for LND API responses
 */

export interface LndInfo {
  version: string;
  identity_pubkey: string;
  alias: string;
  color: string;
  num_active_channels: number;
  num_peers: number;
  block_height: number;
  block_hash: string;
  synced_to_chain: boolean;
  testnet: boolean;
  chains: string[];
}

export interface LndInvoice {
  memo: string;
  r_preimage: string | Buffer;
  r_hash: string | Buffer;
  r_hash_str?: string;
  value: string | number;
  value_msat: string | number;
  settled: boolean;
  creation_date: string | number;
  settle_date: string | number;
  payment_request: string;
  description_hash: string | Buffer;
  expiry: string | number;
  fallback_addr: string;
  cltv_expiry: string | number;
  state: 'OPEN' | 'SETTLED' | 'CANCELED' | 'ACCEPTED';
}

export interface LndInvoicesResponse {
  invoices: LndInvoice[];
  last_index_offset: string;
  first_index_offset: string;
}

export interface LndPayment {
  payment_hash: string;
  value: string | number;
  value_sat: string | number;
  value_msat: string | number;
  payment_request: string;
  status: 'UNKNOWN' | 'IN_FLIGHT' | 'SUCCEEDED' | 'FAILED';
  creation_date: string | number;
  fee: string | number;
  fee_sat: string | number;
  fee_msat: string | number;
  creation_time_ns: string;
  htlcs: any[]; // Detailed HTLC data structure
  path: string[];
}

export interface LndPaymentsResponse {
  payments: LndPayment[];
  first_index_offset: string;
  last_index_offset: string;
}

export interface LndCreateInvoiceRequest {
  value: string | number;
  memo?: string;
  expiry?: number;
  private?: boolean;
}

export interface LndCreateInvoiceResponse {
  r_hash: string | Buffer;
  payment_request: string;
  add_index: string;
}

export interface LndDecodedPaymentRequest {
  destination: string;
  payment_hash: string;
  num_satoshis: string | number;
  timestamp: string | number;
  expiry: string | number;
  description: string;
  description_hash: string;
  fallback_addr: string;
  cltv_expiry: string | number;
  route_hints: any[];
}

export interface LndSendPaymentResponse {
  payment_error: string;
  payment_preimage: string;
  payment_route: any;
  payment_hash: string;
} 