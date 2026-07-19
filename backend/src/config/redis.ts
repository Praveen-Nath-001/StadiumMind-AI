import { createClient } from 'redis';
import env from './env';
import logger from '../utils/logger';

const redisClient = createClient({
  url: env.REDIS_URL,
});

redisClient.on('error', (err) => {
  logger.error(`Redis connection error: ${err.message}`);
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis server successfully.');
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis is reconnecting...');
});

// Immediately connect to Redis in async fashion, log if failure
redisClient.connect().catch((err) => {
  logger.error(`Failed to establish initial Redis connection: ${err.message}`);
});

export const cache = {
  async get(key: string): Promise<string | null> {
    try {
      if (!redisClient.isOpen) return null;
      return await redisClient.get(key);
    } catch (e: any) {
      logger.error(`Redis GET error: ${e.message}`);
      return null;
    }
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (!redisClient.isOpen) return;
      if (ttlSeconds) {
        await redisClient.set(key, value, { EX: ttlSeconds });
      } else {
        await redisClient.set(key, value);
      }
    } catch (e: any) {
      logger.error(`Redis SET error: ${e.message}`);
    }
  },

  async del(key: string): Promise<void> {
    try {
      if (!redisClient.isOpen) return;
      await redisClient.del(key);
    } catch (e: any) {
      logger.error(`Redis DEL error: ${e.message}`);
    }
  },
};

export default redisClient;
