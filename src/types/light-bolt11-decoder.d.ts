/**
 * Type definitions for light-bolt11-decoder
 */

declare module 'light-bolt11-decoder' {
  export interface DecodedSection {
    name: string;
    tag?: string;
    letters?: string;
    value?: string | number | boolean | Record<string, any>;
    positions?: {
      start: number;
      end: number;
    };
  }

  export interface RouteHint {
    pubkey: string;
    short_channel_id: string;
    fee_base_msat: number;
    fee_proportional_millionths: number;
    cltv_expiry_delta: number;
  }

  export interface FeatureBits {
    option_data_loss_protect?: 'required' | 'unsupported';
    initial_routing_sync?: 'required' | 'unsupported';
    option_upfront_shutdown_script?: 'required' | 'unsupported';
    gossip_queries?: 'required' | 'unsupported';
    var_onion_optin?: 'required' | 'unsupported';
    gossip_queries_ex?: 'required' | 'unsupported';
    option_static_remotekey?: 'required' | 'unsupported';
    payment_secret?: 'required' | 'unsupported';
    basic_mpp?: 'required' | 'unsupported';
    option_support_large_channel?: 'required' | 'unsupported';
    extra_bits?: {
      start_bit: number;
      bits: any[];
      has_required: boolean;
    };
    [key: string]: any;
  }

  export interface DecodedInvoice {
    paymentRequest: string;
    network: string;
    sections: DecodedSection[];
    expiry?: number;
    timestamp: number;
    tagsObject?: Record<string, any>;
    wordsObject?: Record<string, any>;
    paymentHash?: string;
    amount?: string;
    description?: string;
    route_hints?: RouteHint[][];
  }

  export function decode(paymentRequest: string): DecodedInvoice;
} 