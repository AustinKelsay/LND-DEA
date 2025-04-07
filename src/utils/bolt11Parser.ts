import { decode, DecodedInvoice, DecodedSection } from 'light-bolt11-decoder';
import { ParsedInvoice } from '../models/interfaces';
import { Bolt11ParseError } from './errors';

/**
 * Parses a Bolt11 invoice and extracts relevant information
 * @param paymentRequest The Bolt11 invoice string
 * @param userIdentifierPattern Optional regex pattern to extract user identifier from memo
 * @returns ParsedInvoice object
 * @throws Bolt11ParseError if parsing fails
 */
export function parseInvoice(paymentRequest: string, userIdentifierPattern?: RegExp): ParsedInvoice {
  try {
    const decoded: DecodedInvoice = decode(paymentRequest);
    
    // Extract payment hash
    const hashSection = decoded.sections.find((section: DecodedSection) => section.name === 'payment_hash');
    if (!hashSection || !('value' in hashSection)) {
      throw new Bolt11ParseError('Invalid invoice: missing payment hash', paymentRequest);
    }
    
    // Extract amount
    let amount = '0';
    const amountSection = decoded.sections.find((section: DecodedSection) => section.name === 'amount');
    if (amountSection && 'value' in amountSection) {
      amount = amountSection.value as string;
    }
    
    // Extract memo/description
    let memo: string | undefined;
    const descriptionSection = decoded.sections.find((section: DecodedSection) => section.name === 'description');
    if (descriptionSection && 'value' in descriptionSection) {
      memo = descriptionSection.value as string;
    }
    
    // Extract expiry (defaults to 3600 seconds if not specified)
    let expiry = 3600;
    const expirySection = decoded.sections.find((section: DecodedSection) => section.name === 'expiry');
    if (expirySection && 'value' in expirySection) {
      expiry = expirySection.value as number;
    }
    
    // Extract timestamp
    const timestampSection = decoded.sections.find((section: DecodedSection) => section.name === 'timestamp');
    if (!timestampSection || !('value' in timestampSection)) {
      throw new Bolt11ParseError('Invalid invoice: missing timestamp', paymentRequest);
    }
    const timestamp = timestampSection.value as number;
    
    // Extract user identifier from memo if pattern is provided
    let userIdentifier: string | undefined;
    if (memo && userIdentifierPattern) {
      const match = memo.match(userIdentifierPattern);
      if (match && match[1]) {
        userIdentifier = match[1];
      }
    }
    
    return {
      paymentRequest,
      rHash: hashSection.value as string,
      amount,
      memo,
      userIdentifier,
      expiry,
      timestamp,
      rawData: JSON.stringify(decoded)
    };
  } catch (error) {
    // If it's already our custom error, just rethrow it
    if (error instanceof Bolt11ParseError) {
      throw error;
    }
    
    // Otherwise wrap it in our custom error
    throw new Bolt11ParseError(
      `Failed to parse invoice: ${(error as Error).message}`,
      paymentRequest
    );
  }
} 