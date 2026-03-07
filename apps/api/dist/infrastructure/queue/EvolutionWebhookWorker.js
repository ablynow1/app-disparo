"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evolutionWebhookWorker = void 0;
const bullmq_1 = require("bullmq");
const ProcessIncomingMessageUseCase_1 = require("../../application/useCases/ProcessIncomingMessageUseCase");
const EvolutionWebhookQueue_1 = require("./EvolutionWebhookQueue");
const pino_1 = require("../logger/pino");
const redis_1 = require("../redis/redis");
const processMessageUseCase = new ProcessIncomingMessageUseCase_1.ProcessIncomingMessageUseCase();
exports.evolutionWebhookWorker = new bullmq_1.Worker(EvolutionWebhookQueue_1.EVOLUTION_WEBHOOK_QUEUE_NAME, async (job) => {
    pino_1.logger.info(`[Worker INBOUND] 🛠️ Recebendo Webhook de IA ID: ${job.id} - Elevando Concorrência.`);
    await processMessageUseCase.execute(job.data);
}, {
    connection: redis_1.sharedRedisConnection,
    concurrency: 50, // Tuning V8: 50 avaliações de RAG/IA simultâneas por node worker
    limiter: { max: 500, duration: 1000 } // Limite elevado para aguentar rajadas DDoS
});
exports.evolutionWebhookWorker.on('completed', (job) => {
    pino_1.logger.info(`[Worker] ✨ Job ${job.id} finalizado com sucesso.`);
});
exports.evolutionWebhookWorker.on('failed', (job, err) => {
    pino_1.logger.error(`[Worker] 🚨 Job ${job?.id} falhou! Motivo: ${err.message}`);
});
