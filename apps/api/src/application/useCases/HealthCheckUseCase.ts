import { CacheRepository } from '../interfaces/CacheRepository';
import { AppError } from '../../domain/errors/AppError';

interface HealthCheckResponse {
  api: 'ok';
  redis: string | 'failed';
  timestamp: string;
}

export class HealthCheckUseCase {
  constructor(private cacheRepository: CacheRepository) {}

  async execute(): Promise<HealthCheckResponse> {
    try {
      const redisPing = await this.cacheRepository.ping();
      
      return {
        api: 'ok',
        redis: redisPing, // Should be "PONG"
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new AppError('Service Unavailable: Dependent services are failing.', 503);
    }
  }
}
