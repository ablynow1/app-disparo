"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = healthRoutes;
const HealthController_1 = require("../controllers/HealthController");
const HealthCheckUseCase_1 = require("../../application/useCases/HealthCheckUseCase");
const RedisService_1 = require("../../infrastructure/redis/RedisService");
async function healthRoutes(app) {
    // Manual Dependency Injection for this route
    const redisService = new RedisService_1.RedisService();
    const healthCheckUseCase = new HealthCheckUseCase_1.HealthCheckUseCase(redisService);
    const healthController = new HealthController_1.HealthController(healthCheckUseCase);
    app.get('/health', async (request, reply) => {
        return healthController.handle(request, reply);
    });
}
