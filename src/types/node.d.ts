/**
 * Type definitions for Node.js Buffer and related global types
 * These augment the built-in types to add missing declarations for our project
 */

declare global {
  // Augment global Buffer checking functions
  namespace NodeJS {
    interface Global {
      Buffer: typeof Buffer;
    }
  }

  // Ensure Buffer.isBuffer is recognized
  interface Buffer {
    // Buffer static methods
    static isBuffer(obj: any): obj is Buffer;
    static from(arrayBuffer: ArrayBuffer | SharedArrayBuffer, byteOffset?: number, length?: number): Buffer;
    static from(data: any[] | Uint8Array): Buffer;
    static from(str: string, encoding?: BufferEncoding): Buffer;

    // Buffer instance methods
    toString(encoding?: BufferEncoding, start?: number, end?: number): string;
    toJSON(): { type: 'Buffer'; data: number[] };
  }
}

/**
 * Type declarations for Node.js built-in modules
 */

declare module 'fs' {
  export * from 'node:fs';
}

declare module 'http' {
  export * from 'node:http';
}

declare module 'https' {
  export * from 'node:https';
}

declare module 'path' {
  export * from 'node:path';
}

declare module 'crypto' {
  export * from 'node:crypto';
}

declare global {
  interface Buffer extends Uint8Array {
    // Buffer already has its type definitions in @types/node
  }
}

export {}; 