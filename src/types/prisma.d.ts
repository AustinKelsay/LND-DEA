// Fix for mismatched imports between local Prisma enums and @prisma/client imports
import { PrismaClient as OriginalPrismaClient } from '@prisma/client';

declare module '@prisma/client' {
  // Re-export the enums from the local Prisma installation
  export type TransactionType = import('../node_modules/.prisma/client/index').$Enums.TransactionType;
  export type TransactionStatus = import('../node_modules/.prisma/client/index').$Enums.TransactionStatus;
  
  // Ensure PrismaClient is both a type and a value
  export const PrismaClient: typeof OriginalPrismaClient;
  export type PrismaClient = OriginalPrismaClient;
} 