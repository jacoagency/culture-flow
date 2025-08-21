import Redis from 'ioredis';
import { logger } from '@/utils/logger';

class RedisService {
  private static instance: RedisService;
  public client: Redis;
  public subscriber: Redis;
  public publisher: Redis;

  private constructor() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };

    this.client = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);

    this.setupEventHandlers();
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error:', error);
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      await this.subscriber.connect();
      await this.publisher.connect();
      logger.info('All Redis connections established');
    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      await this.subscriber.disconnect();
      await this.publisher.disconnect();
      logger.info('All Redis connections closed');
    } catch (error) {
      logger.error('Redis disconnection failed:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  // Cache utilities for mobile optimization
  public async cacheUserFeed(userId: string, feed: any[], ttl: number = 3600): Promise<void> {
    const key = `user:${userId}:feed`;
    await this.client.setex(key, ttl, JSON.stringify(feed));
  }

  public async getUserFeed(userId: string): Promise<any[] | null> {
    const key = `user:${userId}:feed`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  public async cacheRecommendations(userId: string, recommendations: any[], ttl: number = 1800): Promise<void> {
    const key = `user:${userId}:recommendations`;
    await this.client.setex(key, ttl, JSON.stringify(recommendations));
  }

  public async getRecommendations(userId: string): Promise<any[] | null> {
    const key = `user:${userId}:recommendations`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  public async incrementViewCount(contentId: string): Promise<number> {
    const key = `content:${contentId}:views`;
    return await this.client.incr(key);
  }

  public async setUserSession(userId: string, sessionData: any, ttl: number = 86400): Promise<void> {
    const key = `session:${userId}`;
    await this.client.setex(key, ttl, JSON.stringify(sessionData));
  }

  public async getUserSession(userId: string): Promise<any | null> {
    const key = `session:${userId}`;
    const session = await this.client.get(key);
    return session ? JSON.parse(session) : null;
  }

  public async deleteUserSession(userId: string): Promise<void> {
    const key = `session:${userId}`;
    await this.client.del(key);
  }
}

export const redis = RedisService.getInstance();
export default redis;