import { Queue } from 'bullmq';
import { sharedRedisConnection } from '../redis/redis';

export const evolutionOutboundQueue = new Queue('evolution-outbound-queue', {
  connection: sharedRedisConnection as any,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000 // Tenta enviar o webhook pra Evolution em 5s, 25s, 125s (2min)... se falhar
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600,
      count: 5000
    }
  }
});
