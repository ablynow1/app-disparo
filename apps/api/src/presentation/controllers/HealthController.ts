import { FastifyReply, FastifyRequest } from 'fastify';
import { HealthCheckUseCase } from '../../application/useCases/HealthCheckUseCase';

export class HealthController {
  constructor(private readonly healthCheckUseCase: HealthCheckUseCase) {}

  async handle(request: FastifyRequest, reply: FastifyReply) {
    const result = await this.healthCheckUseCase.execute();
    return reply.status(200).send(result);
  }
}
