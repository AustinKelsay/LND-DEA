import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiKeyAuth } from './middleware/authMiddleware';
import { AppError } from './utils/errors';
import { createLndMonitorService } from './services/lndMonitorService';
import lndService from './services/lndService';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize and start LND monitor service
const lndMonitor = createLndMonitorService(prisma);
lndMonitor.start();

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
app.use(apiKeyAuth);

// Routes
app.use('/api', routes);

// Health check
app.get('/health', async (_req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check LND connection if configured
    let lndStatus = 'disabled';
    if (lndService.isConfigured()) {
      try {
        await lndService.getInfo();
        lndStatus = 'connected';
      } catch (error) {
        lndStatus = 'error';
      }
    }
    
    res.json({ 
      status: 'ok',
      database: 'connected',
      lnd: lndStatus
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Health check failed',
      details: process.env.NODE_ENV !== 'production' ? String(error) : undefined
    });
  }
});

// Handle 404 errors
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Start server
const server = app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
  logger.info('Shutting down server...');
  
  // Stop the LND monitor
  lndMonitor.stop();
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connection
    prisma.$disconnect()
      .then(() => {
        logger.info('Database connection closed');
        process.exit(0);
      })
      .catch(error => {
        logger.error('Error closing database connection:', error);
        process.exit(1);
      });
  });
}

// Handle global unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection:', reason);
  
  // Convert unhandled rejections to proper AppErrors
  if (!(reason instanceof AppError)) {
    const message = reason instanceof Error 
      ? reason.message 
      : 'Unknown error occurred';
    
    logger.error(new AppError(message, 500));
  }
});

export default app; 