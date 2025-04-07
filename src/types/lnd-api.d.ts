// Type definitions for LND API responses

export interface LndInvoice {
  memo: string;
  r_preimage: string;
  r_hash: string;
  value: string;
  value_msat: string;
  settled: boolean;
  creation_date: string;
  settle_date: string;
  payment_request: string;
  description_hash: string;
  expiry: string;
  fallback_addr: string;
  cltv_expiry: string;
  route_hints: LndRouteHint[];
  private: boolean;
  add_index: string;
  settle_index: string;
  amt_paid: string;
  amt_paid_sat: string;
  amt_paid_msat: string;
  state: LndInvoiceState;
  htlcs: LndInvoiceHTLC[];
  features: Record<string, LndFeature>;
  is_keysend: boolean;
  payment_addr: string;
  is_amp: boolean;
  amp_invoice_state?: Record<string, any>;
}

export enum LndInvoiceState {
  OPEN = 'OPEN',
  SETTLED = 'SETTLED',
  CANCELED = 'CANCELED',
  ACCEPTED = 'ACCEPTED'
}

export interface LndFeature {
  name: string;
  is_required: boolean;
  is_known: boolean;
}

export interface LndInvoiceHTLC {
  chan_id: string;
  htlc_index: string;
  amt_msat: string;
  accept_height: number;
  accept_time: string;
  resolve_time: string;
  expiry_height: number;
  state: string;
  custom_records: Record<string, string>;
  mpp_total_amt_msat: string;
  amp?: any;
}

export interface LndRouteHint {
  hop_hints: LndHopHint[];
}

export interface LndHopHint {
  node_id: string;
  chan_id: string;
  fee_base_msat: number;
  fee_proportional_millionths: number;
  cltv_expiry_delta: number;
}

export interface LndInvoiceSubscription {
  result: LndInvoice;
}

export interface LndListInvoicesResponse {
  invoices: LndInvoice[];
  last_index_offset: string;
  first_index_offset: string;
}

export interface LndAddInvoiceResponse {
  r_hash: string;
  payment_request: string;
  add_index: string;
  payment_addr: string;
}

export interface LndPaymentResponse {
  payment_hash: string;
  value: string;
  creation_date: string;
  fee: string;
  payment_preimage: string;
  value_sat: string;
  value_msat: string;
  payment_request: string;
  status: LndPaymentStatus;
  fee_sat: string;
  fee_msat: string;
  creation_time_ns: string;
  htlcs: LndHTLCAttempt[];
  payment_index: string;
  failure_reason?: LndPaymentFailureReason;
}

export enum LndPaymentStatus {
  IN_FLIGHT = 'IN_FLIGHT',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED'
}

export enum LndPaymentFailureReason {
  FAILURE_REASON_NONE = 'FAILURE_REASON_NONE',
  FAILURE_REASON_TIMEOUT = 'FAILURE_REASON_TIMEOUT',
  FAILURE_REASON_NO_ROUTE = 'FAILURE_REASON_NO_ROUTE',
  FAILURE_REASON_ERROR = 'FAILURE_REASON_ERROR',
  FAILURE_REASON_INCORRECT_PAYMENT_DETAILS = 'FAILURE_REASON_INCORRECT_PAYMENT_DETAILS',
  FAILURE_REASON_INSUFFICIENT_BALANCE = 'FAILURE_REASON_INSUFFICIENT_BALANCE'
}

export interface LndHTLCAttempt {
  attempt_id: string;
  status: string;
  route: LndRoute;
  attempt_time_ns: string;
  resolve_time_ns: string;
  failure?: any;
  preimage: string;
}

export interface LndRoute {
  total_time_lock: number;
  total_fees: string;
  total_amt: string;
  hops: LndHop[];
  total_fees_msat: string;
  total_amt_msat: string;
}

export interface LndHop {
  chan_id: string;
  chan_capacity: string;
  amt_to_forward: string;
  fee: string;
  expiry: number;
  amt_to_forward_msat: string;
  fee_msat: string;
  pub_key: string;
}

export interface LndErrorResponse {
  error: string;
  code: number;
  message: string;
} 