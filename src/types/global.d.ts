/**
 * Global TypeScript declarations
 */

// Node.js process module
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'production' | 'test';
    PORT?: string;
    DATABASE_URL?: string;
    LND_REST_HOST?: string;
    LND_MACAROON_PATH?: string;
    LND_TLS_CERT_PATH?: string;
    USER_IDENTIFIER_PATTERN?: string;
    API_KEY?: string;
    [key: string]: string | undefined;
  }
}

// Error constructor extension
interface ErrorConstructor {
  captureStackTrace(targetObject: object, constructorOpt?: Function): void;
}

// Global type declarations for the project

// Node.js modules
declare module 'fs' {
  export * from 'node:fs';
}

declare module 'https' {
  export * from 'node:https';
}

declare module 'http' {
  export * from 'node:http';
}

// Add @prisma/client module declaration
declare module '@prisma/client' {
  // Re-export everything from the original module
  export * from '@prisma/client/index';
  
  // Add our schema-specific enums
  export enum TransactionType {
    INCOMING = 'INCOMING',
    OUTGOING = 'OUTGOING'
  }
  
  export enum TransactionStatus {
    PENDING = 'PENDING',
    COMPLETE = 'COMPLETE',
    FAILED = 'FAILED'
  }
}

// Ensure Buffer type is properly recognized
interface Buffer extends Uint8Array {
  write(string: string, offset?: number, length?: number, encoding?: string): number;
  toString(encoding?: string, start?: number, end?: number): string;
  toJSON(): { type: 'Buffer'; data: number[] };
  equals(otherBuffer: Uint8Array): boolean;
  compare(otherBuffer: Uint8Array): number;
  copy(targetBuffer: Uint8Array, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
  slice(start?: number, end?: number): Buffer;
  subarray(start?: number, end?: number): Buffer;
  writeUIntLE(value: number, offset: number, byteLength: number): number;
  writeUIntBE(value: number, offset: number, byteLength: number): number;
  writeIntLE(value: number, offset: number, byteLength: number): number;
  writeIntBE(value: number, offset: number, byteLength: number): number;
  readUIntLE(offset: number, byteLength: number): number;
  readUIntBE(offset: number, byteLength: number): number;
  readIntLE(offset: number, byteLength: number): number;
  readIntBE(offset: number, byteLength: number): number;
  readUInt8(offset: number): number;
  readUInt16LE(offset: number): number;
  readUInt16BE(offset: number): number;
  readUInt32LE(offset: number): number;
  readUInt32BE(offset: number): number;
  readInt8(offset: number): number;
  readInt16LE(offset: number): number;
  readInt16BE(offset: number): number;
  readInt32LE(offset: number): number;
  readInt32BE(offset: number): number;
  readFloatLE(offset: number): number;
  readFloatBE(offset: number): number;
  readDoubleLE(offset: number): number;
  readDoubleBE(offset: number): number;
  writeUInt8(value: number, offset: number): number;
  writeUInt16LE(value: number, offset: number): number;
  writeUInt16BE(value: number, offset: number): number;
  writeUInt32LE(value: number, offset: number): number;
  writeUInt32BE(value: number, offset: number): number;
  writeInt8(value: number, offset: number): number;
  writeInt16LE(value: number, offset: number): number;
  writeInt16BE(value: number, offset: number): number;
  writeInt32LE(value: number, offset: number): number;
  writeInt32BE(value: number, offset: number): number;
  writeFloatLE(value: number, offset: number): number;
  writeFloatBE(value: number, offset: number): number;
  writeDoubleLE(value: number, offset: number): number;
  writeDoubleBE(value: number, offset: number): number;
}

// Ensure Buffer is properly declared
interface BufferConstructor {
  from(data: string, encoding?: string): Buffer;
  isBuffer(obj: any): obj is Buffer;
}

// Add other module declarations as needed 