import { Queue } from 'bullmq';
import { sharedRedisConnection } from '../redis/redis';

export const EVOLUTION_WEBHOOK_QUEUE_NAME = 'evolution-webhooks';

export const evolutionWebhookQueue = new Queue(EVOLUTION_WEBHOOK_QUEUE_NAME, {
  connection: sharedRedisConnection as any,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 25s, 125s in case of failure (OpenAI timeout)
    },
    removeOnComplete: true, // Keep Redis memory clean
    removeOnFail: false, // Keep trace of failed jobs for manual review or DLQ
  },
});
