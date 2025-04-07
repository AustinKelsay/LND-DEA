/**
 * Type definitions for LND API responses
 */

// LND Invoice
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
  route_hints: any[];
  private: boolean;
  add_index: string | number;
  settle_index: string | number;
  amt_paid: string | number;
  amt_paid_sat: string | number;
  amt_paid_msat: string | number;
  state: string;
  htlcs: any[];
  features: Record<string, any>;
  is_keysend: boolean;
  payment_addr: string | Buffer;
  is_amp: boolean;
  amp_invoice_state: Record<string, any>;
}

// LND Get Invoice Response
export interface LndGetInvoiceResponse {
  invoice: LndInvoice;
}

// LND List Invoices Response
export interface LndListInvoicesResponse {
  invoices: LndInvoice[];
  last_index_offset: string;
  first_index_offset: string;
}

// LND Payment
export interface LndPayment {
  payment_hash: string;
  value: string | number;
  value_sat: string | number;
  value_msat: string | number;
  payment_request: string;
  status: 'UNKNOWN' | 'IN_FLIGHT' | 'SUCCEEDED' | 'FAILED';
  fee: string | number;
  fee_sat: string | number;
  fee_msat: string | number;
  creation_time_ns: string;
  htlcs: any[];
  payment_index: string | number;
  failure_reason: string;
}

// LND List Payments Response
export interface LndListPaymentsResponse {
  payments: LndPayment[];
  first_index_offset: string;
  last_index_offset: string;
}

// LND Node Info
export interface LndNodeInfo {
  version: string;
  commit_hash: string;
  identity_pubkey: string;
  alias: string;
  color: string;
  num_pending_channels: number;
  num_active_channels: number;
  num_inactive_channels: number;
  num_peers: number;
  block_height: number;
  block_hash: string;
  synced_to_chain: boolean;
  synced_to_graph: boolean;
  best_header_timestamp: string;
  chains: {
    chain: string;
    network: string;
  }[];
  uris: string[];
  features: Record<string, any>;
}

// LND Decoded Payment Request
export interface LndDecodedPaymentRequest {
  destination: string;
  payment_hash: string;
  num_satoshis: string;
  timestamp: string;
  expiry: string;
  description: string;
  description_hash: string;
  fallback_addr: string;
  cltv_expiry: string;
  route_hints: any[];
  payment_addr: string;
  num_msat: string;
  features: Record<string, any>;
} 