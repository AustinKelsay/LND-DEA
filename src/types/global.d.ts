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

// Add other module declarations as needed 