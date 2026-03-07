import { afterAll, beforeAll } from 'vitest';
import { prisma } from '@app-disparo/database';
import { sharedRedisConnection } from '../src/infrastructure/redis/redis';
import { app } from '../src/infrastructure/http/fastify/server';

beforeAll(async () => {
  // Limpar dados do BD Fake / Test Container se necessário, ou apenas deixar pronto.
  await app.ready(); // Inicializa plugins do fastify silenciosamente
});

afterAll(async () => {
  await prisma.$disconnect();
  await sharedRedisConnection.quit();
  await app.close();
});
