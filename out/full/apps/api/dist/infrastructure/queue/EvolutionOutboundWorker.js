"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evolutionOutboundWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../redis/redis");
const pino_1 = require("../logger/pino");
const EvolutionApiService_1 = require("../services/EvolutionApiService");
exports.evolutionOutboundWorker = new bullmq_1.Worker('evolution-outbound-queue', async (job) => {
    const { instanceJid, phoneDestination, text, orderId } = job.data;
    pino_1.logger.info(`[OutboundWorker] Preparando envio de mensagem via Instância [${instanceJid}] para o número [${phoneDestination}]${orderId ? ` (Pedido: ${orderId})` : ''}`);
    // Removendo traços e espaços, e aplicando o prefixo @s.whatsapp.net se necessário
    const cleanPhone = phoneDestination.replace(/\D/g, '');
    const remoteJid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
    try {
        // Chama o Service da API Dinamicamente com o Roteador Balanceado
        await EvolutionApiService_1.EvolutionApiService.sendText(instanceJid, remoteJid, text);
        pino_1.logger.info(`[OutboundWorker] ✅ Mensagem enviada com sucesso para ${remoteJid}`);
    }
    catch (error) {
        pino_1.logger.error({ err: error.message }, `[OutboundWorker] ❌ Falha catastrófica ao enviar mensagem para ${remoteJid} na instância ${instanceJid}`);
        throw error; // Lança o erro para o BullMQ tentar novamente no exponential backoff
    }
}, {
    connection: redis_1.sharedRedisConnection,
    concurrency: 50 // Tuning O(1): 50 disparos simultâneos não-bloqueantes WhatsApp
});
const database_1 = require("@app-disparo/database");
exports.evolutionOutboundWorker.on('failed', async (job, err) => {
    pino_1.logger.error(err, `[OutboundWorker] JOB FALHOU (Id: ${job?.id}, Tentativa: ${job?.attemptsMade}/${job?.opts.attempts}) Motivo: ${err.message}`);
    // Se o Job esgotou todas as tentativas (ex: atingiu as 5 permitidas) vira uma DLQ (Dead Letter)
    if (job && job.attemptsMade >= (job.opts.attempts || 5)) {
        const { orderId, phoneDestination } = job.data;
        pino_1.logger.error(`[DLQ] 🪦 O Job ${job.id} esgotou TODAS as tentativas e Morreu.`);
        if (orderId) {
            try {
                // Salva a auditoria da Falha Irreversível no Banco do Lojista (Painel)
                await database_1.prisma.order.update({
                    where: { id: orderId },
                    data: { status: 'FAILED_TO_SEND' }
                });
                pino_1.logger.info(`[DLQ] Status do Pedido ${orderId} atualizado para FAILED_TO_SEND com sucesso.`);
            }
            catch (dbError) {
                pino_1.logger.error({ err: dbError }, `[DLQ] Falha dupla! Não conseguiu atualizar o pedido ${orderId} para FAILED no Prisma.`);
            }
        }
        else {
            pino_1.logger.warn(`[DLQ] Job ${job.id} não possui um orderId para rastreio no banco (ex: disparo avulso). Telefone afetado: ${phoneDestination}`);
        }
    }
});
