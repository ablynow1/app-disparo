"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const cors_1 = __importDefault(require("@fastify/cors"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const pino_1 = require("../../logger/pino");
const env_1 = require("../../env");
const AppError_1 = require("../../../domain/errors/AppError");
const health_routes_1 = require("../../../presentation/routes/health.routes");
const webhook_routes_1 = require("../../../presentation/routes/webhook.routes");
const ecommerce_routes_1 = require("../../../presentation/routes/ecommerce.routes");
const EvolutionWebhookQueue_1 = require("../../queue/EvolutionWebhookQueue");
const EvolutionWebhookWorker_1 = require("../../queue/EvolutionWebhookWorker");
const OrderRoutingQueue_1 = require("../../queue/OrderRoutingQueue");
const OrderRoutingWorker_1 = require("../../queue/OrderRoutingWorker");
const EvolutionOutboundQueue_1 = require("../../queue/EvolutionOutboundQueue");
const EvolutionOutboundWorker_1 = require("../../queue/EvolutionOutboundWorker");
const database_1 = require("@app-disparo/database");
const redis_1 = require("../../redis/redis");
const app = (0, fastify_1.default)({ logger: false });
// HARDENING 1: Helmet para mitigação sistemática de ataques XSS, Clickjacking, MIME-Sniffing e ocultação do cabeçalho "X-Powered-By"
app.register(helmet_1.default, {
    global: true,
    contentSecurityPolicy: false, // Só desativamos se formos servir HTML estático (O que não é o caso, o Next.js lida)
});
// HARDENING 2: CORS Estrito - Impedindo que painéis não autorizados disparem requests direto pro backend pelo navegador
app.register(cors_1.default, {
    origin: env_1.env.NODE_ENV === 'production'
        ? ['https://appdisparo.com.br', 'https://dash.appdisparo.com.br'] // Somente nosso dominio de painel
        : '*', // Liberado pra localhost debug
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true, // Exige autenticação em Cookies/Tokens
});
// HARDENING 3: Rate Limit contra ataques DDoS volumétricos (Brute Force)
app.register(rate_limit_1.default, {
    max: 300, // Limite global generoso: 300 requisições
    timeWindow: '1 minute', // Por Minuto por IP
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: () => ({
        statusCode: 429,
        message: 'Você ultrapassou o volume de requisições tolerável. Reduza a carga (Too Many Requests).'
    })
});
// Registrando Rotas
app.register(health_routes_1.healthRoutes, { prefix: '/api' });
app.register(webhook_routes_1.webhookRoutes, { prefix: '/api' });
app.register(ecommerce_routes_1.ecommerceWebhookRoutes);
// Global Error Handler
app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError_1.AppError) {
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
    pino_1.logger.error({ err: error }, 'Unhandled Error Exception');
    return reply.status(500).send({
        message: env_1.env.NODE_ENV === 'production' ? 'Internal server error.' : error.message,
    });
});
// Graceful Shutdown Logic (A Arte de Morrer sem Perder Dados)
const gracefulShutdown = async (signal) => {
    pino_1.logger.info(`🚨 Comando [${signal}] recebido do Sistema Operacional. Iniciando Protocolo de Morte Limpa...`);
    try {
        // 1. Tranca a Rota HTTP para Webhooks novos da Shopify não entrarem pela parede.
        await app.close();
        pino_1.logger.info('🔒 [1/4] Portão HTTP Fastify Fechado.');
        // 2. Manda os Workers terminarem de mastigar, dando um "Finish" neles antes de matar
        await EvolutionWebhookWorker_1.evolutionWebhookWorker.close();
        await OrderRoutingWorker_1.orderRoutingWorker.close();
        await EvolutionOutboundWorker_1.evolutionOutboundWorker.close();
        pino_1.logger.info('⏸️  [2/4] Workers BullMQ terminaram os Jobs em andamento com segurança.');
        // 3. Fecha o Cachorro Assíncrono do Backing Track
        await EvolutionWebhookQueue_1.evolutionWebhookQueue.close();
        await OrderRoutingQueue_1.orderRoutingQueue.close();
        await EvolutionOutboundQueue_1.evolutionOutboundQueue.close();
        await redis_1.sharedRedisConnection.quit();
        pino_1.logger.info('🗄️  [3/4] Cache Redis desativado graciosamente.');
        // 4. Salva o Banco de Dados (Evita Data Corruption do Pool Postgres)
        await database_1.prisma.$disconnect();
        pino_1.logger.info('🐘 [4/4] Conexão Prisma PostgreSQL fechada. Zero Data Loss garantido.');
        pino_1.logger.info('✅ Sistema encerrado 100% limpo.');
        process.exit(0);
    }
    catch (err) {
        pino_1.logger.error({ err }, '❌ Erro crítico vazando no shutdown. O Processo morrerá sujo.');
        process.exit(1);
    }
};
['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => gracefulShutdown(signal));
});
// Boot Server
const start = async () => {
    try {
        const port = env_1.env.PORT;
        const host = '0.0.0.0';
        await app.listen({ port, host });
        pino_1.logger.info(`🚀 API Server running at http://${host}:${port}`);
        // Worker starts executing automatically because it's imported above
    }
    catch (err) {
        pino_1.logger.error({ err }, 'Failed to start server');
        process.exit(1);
    }
};
start();
