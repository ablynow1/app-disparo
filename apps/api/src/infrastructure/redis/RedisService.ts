import Redis from 'ioredis';
import { env } from '../env';
import { logger } from '../logger/pino';
import { CacheRepository } from '../../application/interfaces/CacheRepository';

export class RedisService implements CacheRepository {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    this.redis.on('error', (err) => logger.error({ err }, 'Redis connection error'));
    this.redis.on('connect', () => logger.info('🔗 Redis connected'));
  }

  async ping(): Promise<string> {
    return this.redis.ping();
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.set(key, value, 'EX', ttl);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
