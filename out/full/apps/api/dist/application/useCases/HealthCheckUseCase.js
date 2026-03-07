"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthCheckUseCase = void 0;
const AppError_1 = require("../../domain/errors/AppError");
class HealthCheckUseCase {
    cacheRepository;
    constructor(cacheRepository) {
        this.cacheRepository = cacheRepository;
    }
    async execute() {
        try {
            const redisPing = await this.cacheRepository.ping();
            return {
                api: 'ok',
                redis: redisPing, // Should be "PONG"
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            throw new AppError_1.AppError('Service Unavailable: Dependent services are failing.', 503);
        }
    }
}
exports.HealthCheckUseCase = HealthCheckUseCase;
