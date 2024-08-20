import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST');
    const port = this.configService.get<number>('REDIS_PORT');

    if (!host || !port) {
      this.logger.error('Redis configuration is missing');
      throw new Error('Redis configuration is missing');
    }

    this.redis = new Redis({
      host,
      port,
    });

    this.redis.on('error', (error) => {
      this.logger.error(
        `Redis connection error: ${error.message}`,
        error.stack,
      );
    });

    this.redis.on('connect', () => {
      this.logger.log('Successfully connected to Redis');
    });
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.redis.set(key, value, 'EX', ttl);
      } else {
        await this.redis.set(key, value);
      }
      this.logger.debug(`Set key: ${key}`);
    } catch (error) {
      this.logger.error(
        `Error setting key ${key}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to set Redis key: ${key}`);
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const value = await this.redis.get(key);
      this.logger.debug(`Get key: ${key}, Value found: ${!!value}`);
      return value;
    } catch (error) {
      this.logger.error(
        `Error getting key ${key}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get Redis key: ${key}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.logger.debug(`Deleted key: ${key}`);
    } catch (error) {
      this.logger.error(
        `Error deleting key ${key}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to delete Redis key: ${key}`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
      this.logger.log('Redis connection closed');
    } catch (error) {
      this.logger.error(
        `Error closing Redis connection: ${error.message}`,
        error.stack,
      );
    }
  }
}
