"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
class HealthController {
    healthCheckUseCase;
    constructor(healthCheckUseCase) {
        this.healthCheckUseCase = healthCheckUseCase;
    }
    async handle(request, reply) {
        const result = await this.healthCheckUseCase.execute();
        return reply.status(200).send(result);
    }
}
exports.HealthController = HealthController;
