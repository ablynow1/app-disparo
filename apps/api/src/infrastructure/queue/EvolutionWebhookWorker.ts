import { Worker, Job } from 'bullmq';
import { ProcessIncomingMessageUseCase } from '../../application/useCases/ProcessIncomingMessageUseCase';
import { EVOLUTION_WEBHOOK_QUEUE_NAME } from './EvolutionWebhookQueue';
import { logger } from '../logger/pino';
import { sharedRedisConnection } from '../redis/redis';

const processMessageUseCase = new ProcessIncomingMessageUseCase();

export const evolutionWebhookWorker = new Worker(
  EVOLUTION_WEBHOOK_QUEUE_NAME,
  async (job: Job) => {
    logger.info(`[Worker INBOUND] 🛠️ Recebendo Webhook de IA ID: ${job.id} - Elevando Concorrência.`);
    await processMessageUseCase.execute(job.data);
  },
  {
    connection: sharedRedisConnection as any,
    concurrency: 50, // Tuning V8: 50 avaliações de RAG/IA simultâneas por node worker
    limiter: { max: 500, duration: 1000 } // Limite elevado para aguentar rajadas DDoS
  }
);

evolutionWebhookWorker.on('completed', (job) => {
  logger.info(`[Worker] ✨ Job ${job.id} finalizado com sucesso.`);
});

evolutionWebhookWorker.on('failed', (job, err) => {
  logger.error(`[Worker] 🚨 Job ${job?.id} falhou! Motivo: ${err.message}`);
});


