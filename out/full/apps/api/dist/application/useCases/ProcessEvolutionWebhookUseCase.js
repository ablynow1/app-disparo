"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessEvolutionWebhookUseCase = void 0;
const zod_1 = require("zod");
const AppError_1 = require("../../domain/errors/AppError");
const EvolutionWebhookQueue_1 = require("../../infrastructure/queue/EvolutionWebhookQueue");
// Strict validation for the expected payload from Evolution API
const evolutionWebhookSchema = zod_1.z.object({
    event: zod_1.z.string().min(1),
    instance: zod_1.z.string().min(1),
    data: zod_1.z.record(zod_1.z.any()), // Can be refined later based on the specific 'event' type (e.g., messages.upsert)
    date_time: zod_1.z.string().optional(),
    sender: zod_1.z.string().optional(),
});
class ProcessEvolutionWebhookUseCase {
    async execute(payload) {
        const parseResult = evolutionWebhookSchema.safeParse(payload);
        if (!parseResult.success) {
            throw new AppError_1.AppError(`Invalid webhook payload structure: ${parseResult.error.message}`, 400);
        }
        const validPayload = parseResult.data;
        // Enqueue the valid payload down to the resilient queue system
        await EvolutionWebhookQueue_1.evolutionWebhookQueue.add('receive-evolution-webhook', validPayload);
    }
}
exports.ProcessEvolutionWebhookUseCase = ProcessEvolutionWebhookUseCase;
