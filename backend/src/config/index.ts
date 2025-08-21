import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_VERSION: z.string().default('v1'),
  
  // Database
  DATABASE_URL: z.string(),
  
  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).default('0'),
  
  // JWT
  JWT_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // OpenAI
  OPENAI_API_KEY: z.string(),
  OPENAI_MODEL: z.string().default('gpt-4'),
  
  // AWS S3
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().optional(),
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // CORS
  CORS_ORIGINS: z.string().default('*'),
  
  // Features
  ENABLE_ANALYTICS: z.string().transform((val) => val === 'true').default('true'),
  DEBUG_MODE: z.string().transform((val) => val === 'true').default('false'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Validate environment
const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(env.error.format());
  process.exit(1);
}

export const config = {
  // Server
  env: env.data.NODE_ENV,
  port: env.data.PORT,
  apiVersion: env.data.API_VERSION,
  isDevelopment: env.data.NODE_ENV === 'development',
  isProduction: env.data.NODE_ENV === 'production',
  isTest: env.data.NODE_ENV === 'test',
  
  // Database
  database: {
    url: env.data.DATABASE_URL,
  },
  
  // Redis
  redis: {
    host: env.data.REDIS_HOST,
    port: env.data.REDIS_PORT,
    password: env.data.REDIS_PASSWORD,
    db: env.data.REDIS_DB,
  },
  
  // JWT
  jwt: {
    secret: env.data.JWT_SECRET,
    refreshSecret: env.data.JWT_REFRESH_SECRET,
    expiresIn: env.data.JWT_EXPIRES_IN,
    refreshExpiresIn: env.data.JWT_REFRESH_EXPIRES_IN,
  },
  
  // OpenAI
  openai: {
    apiKey: env.data.OPENAI_API_KEY,
    model: env.data.OPENAI_MODEL,
  },
  
  // AWS S3
  aws: {
    accessKeyId: env.data.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.data.AWS_SECRET_ACCESS_KEY,
    region: env.data.AWS_REGION,
    s3Bucket: env.data.AWS_S3_BUCKET,
  },
  
  // Cloudinary
  cloudinary: {
    cloudName: env.data.CLOUDINARY_CLOUD_NAME,
    apiKey: env.data.CLOUDINARY_API_KEY,
    apiSecret: env.data.CLOUDINARY_API_SECRET,
  },
  
  // Security
  rateLimit: {
    windowMs: env.data.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.data.RATE_LIMIT_MAX_REQUESTS,
  },
  
  // CORS
  cors: {
    origins: env.data.CORS_ORIGINS === '*' ? true : env.data.CORS_ORIGINS.split(','),
  },
  
  // Features
  features: {
    analytics: env.data.ENABLE_ANALYTICS,
    debug: env.data.DEBUG_MODE,
  },
  
  // Logging
  logging: {
    level: env.data.LOG_LEVEL,
  },
  
  // Mobile optimization settings
  mobile: {
    maxImageSize: 5 * 1024 * 1024, // 5MB
    imageCompressionQuality: 80,
    cacheTimeout: 3600, // 1 hour
    feedPageSize: 20,
    recommendationCount: 50,
  },
  
  // Gamification settings
  gamification: {
    dailyStreakBonus: 10,
    weeklyStreakBonus: 50,
    completionBonus: 5,
    perfectScoreBonus: 15,
    firstTimeBonus: 20,
  },
} as const;

export default config;