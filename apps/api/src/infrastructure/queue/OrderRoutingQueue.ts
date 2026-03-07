import { Queue } from 'bullmq';
import { sharedRedisConnection } from '../redis/redis';

export const orderRoutingQueue = new Queue('order-routing-queue', {
  connection: sharedRedisConnection as any,
  defaultJobOptions: {
    attempts: 5, // Tenta mandar o Pix Pendente 5 Vezes se der erro de rede
    backoff: {
      type: 'exponential',
      delay: 5000 // Tenta em 5s, depois 25s, 125s (2min)...
    },
    removeOnComplete: true, // Auto-Limpante pra não lotar a RAM
    removeOnFail: false     // Deixa visível pra debug em DLQ
  }
});
