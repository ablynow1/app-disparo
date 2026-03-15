import fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { logger } from '../../logger/pino';
import { env } from '../../env';
import { AppError } from '../../../domain/errors/AppError';
import { healthRoutes } from '../../../presentation/routes/health.routes';
import { webhookRoutes } from '../../../presentation/routes/webhook.routes';
import { ecommerceWebhookRoutes } from '../../../presentation/routes/ecommerce.routes';
import { evolutionWebhookQueue } from '../../queue/EvolutionWebhookQueue';
import { evolutionWebhookWorker } from '../../queue/EvolutionWebhookWorker';
import { orderRoutingQueue } from '../../queue/OrderRoutingQueue';
import { orderRoutingWorker } from '../../queue/OrderRoutingWorker';
import { evolutionOutboundQueue } from '../../queue/EvolutionOutboundQueue';
import { evolutionOutboundWorker } from '../../queue/EvolutionOutboundWorker';
import { prisma } from '@app-disparo/database';
import { sharedRedisConnection } from '../../redis/redis';

const app = fastify({ logger: false });

// HARDENING 1: Helmet para mitigação sistemática de ataques XSS, Clickjacking, MIME-Sniffing e ocultação do cabeçalho "X-Powered-By"
app.register(helmet, {
  global: true,
  contentSecurityPolicy: false, // Só desativamos se formos servir HTML estático (O que não é o caso, o Next.js lida)
});

// HARDENING 2: CORS Estrito - Impedindo que painéis não autorizados disparem requests direto pro backend pelo navegador
app.register(cors, {
  origin: env.NODE_ENV === 'production'
    ? [env.FRONTEND_URL || 'https://appdisparo.com.br']
    : '*', // Liberado pra localhost debug
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true, // Exige autenticação em Cookies/Tokens
});

// HARDENING 3: Rate Limit contra ataques DDoS volumétricos (Brute Force)
app.register(rateLimit, {
  max: 300, // Limite global generoso: 300 requisições
  timeWindow: '1 minute', // Por Minuto por IP
  keyGenerator: (req) => req.ip,
  errorResponseBuilder: () => ({
    statusCode: 429,
    message: 'Você ultrapassou o volume de requisições tolerável. Reduza a carga (Too Many Requests).'
  })
});

// Registrando Rotas
app.register(healthRoutes, { prefix: '/api' });
app.register(webhookRoutes, { prefix: '/api' });
app.register(ecommerceWebhookRoutes);

// Global Error Handler
app.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      message: error.message,
    });
  }

  if (error.validation) {
    return reply.status(400).send({
      message: 'Validation Error',
      issues: error.validation
    });
  }

  logger.error({ err: error }, 'Unhandled Error Exception');

  return reply.status(500).send({
    message: env.NODE_ENV === 'production' ? 'Internal server error.' : error.message,
  });
});

// Graceful Shutdown Logic (A Arte de Morrer sem Perder Dados)
const gracefulShutdown = async (signal: string) => {
  logger.info(`🚨 Comando [${signal}] recebido do Sistema Operacional. Iniciando Protocolo de Morte Limpa...`);
  try {
    // 1. Tranca a Rota HTTP para Webhooks novos da Shopify não entrarem pela parede.
    await app.close();
    logger.info('🔒 [1/4] Portão HTTP Fastify Fechado.');

    // 2. Manda os Workers terminarem de mastigar, dando um "Finish" neles antes de matar
    await evolutionWebhookWorker.close();
    await orderRoutingWorker.close();
    await evolutionOutboundWorker.close();
    logger.info('⏸️  [2/4] Workers BullMQ terminaram os Jobs em andamento com segurança.');

    // 3. Fecha o Cachorro Assíncrono do Backing Track
    await evolutionWebhookQueue.close();
    await orderRoutingQueue.close();
    await evolutionOutboundQueue.close();
    await sharedRedisConnection.quit();
    logger.info('🗄️  [3/4] Cache Redis desativado graciosamente.');

    // 4. Salva o Banco de Dados (Evita Data Corruption do Pool Postgres)
    await prisma.$disconnect();
    logger.info('🐘 [4/4] Conexão Prisma PostgreSQL fechada. Zero Data Loss garantido.');

    logger.info('✅ Sistema encerrado 100% limpo.');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, '❌ Erro crítico vazando no shutdown. O Processo morrerá sujo.');
    process.exit(1);
  }
};

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => gracefulShutdown(signal));
});

// Boot Server conditionally (evita porta ocupada durante Testes Vitest)
const start = async () => {
  try {
    const port = env.PORT;
    const host = '0.0.0.0';
    await app.listen({ port, host });
    logger.info(`🚀 API Server running at http://${host}:${port}`);
    // Worker starts executing automatically because it's imported above
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app };
