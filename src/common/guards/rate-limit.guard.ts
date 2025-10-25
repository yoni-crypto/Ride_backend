import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimitGuard {
  private rateLimiter: RateLimiterRedis;

  constructor(
    private reflector: Reflector,
    private config: ConfigService
  ) {
    const redisUrl = this.config.get<string>('redis.url') ?? 'redis://localhost:6379';
    const redis = new Redis(redisUrl);

    this.rateLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl',
      points: 100, // Number of requests
      duration: 60, // Per 60 seconds
      blockDuration: 60, // Block for 60 seconds if limit exceeded
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = request.ip || 'unknown';

    try {
      await this.rateLimiter.consume(key);
      return true;
    } catch (rejRes) {
      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }
}
