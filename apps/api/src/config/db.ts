import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { ENV } from './env';

export const prisma = new PrismaClient({
  log: ENV.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export const redis = new Redis(ENV.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

export const redisPub = new Redis(ENV.REDIS_URL);
export const redisSub = new Redis(ENV.REDIS_URL);

redis.on('connect', () => {
  console.log('⚡ Connected to Redis instance');
});

redis.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err.message);
});
