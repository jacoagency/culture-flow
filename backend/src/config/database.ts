import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

class DatabaseService {
  private static instance: DatabaseService;
  public prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'info', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Log slow queries in development (disabled for now due to TS issues)
    if (process.env.NODE_ENV === 'development') {
      // this.prisma.$on('query', (e) => {
      //   if (e.duration > 100) {
      //     logger.warn(`Slow query detected: ${e.duration}ms`, {
      //       query: e.query,
      //       params: e.params,
      //     });
      //   }
      // });
    }
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Database disconnection failed:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}

export const db = DatabaseService.getInstance();
export default db;