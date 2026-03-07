import { FastifyInstance } from 'fastify';
import { HealthController } from '../controllers/HealthController';
import { HealthCheckUseCase } from '../../application/useCases/HealthCheckUseCase';
import { RedisService } from '../../infrastructure/redis/RedisService';

export async function healthRoutes(app: FastifyInstance) {
  // Manual Dependency Injection for this route
  const redisService = new RedisService();
  const healthCheckUseCase = new HealthCheckUseCase(redisService);
  const healthController = new HealthController(healthCheckUseCase);

  app.get('/health', async (request, reply) => {
    return healthController.handle(request, reply);
  });
}
