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
        // 1. LIMITADOR DE TAXA ANTI-BAN (RATE LIMITER via Redis)
        // Mantendo o limite conservador de max 15 mensagens por MINUTO por aparelho WhatsApp (Chip Seguro)
        const MAX_MSGS_PER_MINUTE = 15;
        const rateLimitKey = `rate_limit:instance:${instanceJid}`;
        const currentCount = await typeof redis_1.sharedRedisConnection.incr === 'function'
            ? await redis_1.sharedRedisConnection.incr(rateLimitKey)
            : 1;
        if (currentCount === 1 && typeof redis_1.sharedRedisConnection.expire === 'function') {
            await redis_1.sharedRedisConnection.expire(rateLimitKey, 60); // Janela móvel de 60 segundos
        }
        if (currentCount > MAX_MSGS_PER_MINUTE) {
            pino_1.logger.warn(`[OutboundWorker] 🚨 RATE LIMIT EXCEDIDO para Instância [${instanceJid}]. Encaminhando para Backoff Exponencial Seguro.`);
            // Thrown error volta o Job para a Fila com Exponential Backoff
            throw new Error('RATE_LIMIT_EXCEEDED');
        }
        // 2. HUMANIZAÇÃO: Insere um Delay (Atraso) Aleatório entre 2s e 5s
        const delayMs = Math.floor(Math.random() * (5000 - 2000 + 1) + 2000);
        pino_1.logger.info(`[OutboundWorker] ⏱️ Simulando digitação humana na instância [${instanceJid}]. Aguardando ${delayMs}ms antes do disparo...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        // 3. ENVELOPE: Chama o Service da API Dinamicamente com o Roteador Balanceado
        await EvolutionApiService_1.EvolutionApiService.sendText(instanceJid, remoteJid, text);
        pino_1.logger.info(`[OutboundWorker] ✅ Mensagem enviada com sucesso para ${remoteJid}`);
    }
    catch (error) {
        const errMsg = error.message || String(error);
        // 4. DETECTOR DE QUEDA/BANIMENTO
        if (errMsg.toLowerCase().includes('403') ||
            errMsg.toLowerCase().includes('not connected') ||
            errMsg.toLowerCase().includes('disconnect') ||
            errMsg.toLowerCase().includes('unauthorized') ||
            errMsg.toLowerCase().includes('not exist')) {
            pino_1.logger.error(`[OutboundWorker] ☠️ WhatsApp APAGÃO Detectado! Instância [${instanceJid}] será DESATIVADA do Roteador.`);
            try {
                // Desconecta a instância p/ impedir envio de novas buchas
                await database_1.prisma.instance.updateMany({
                    where: { name: instanceJid },
                    data: { status: 'disconnected' }
                });
            }
            catch (dbErr) {
                pino_1.logger.error({ err: dbErr }, `[OutboundWorker] Falha ao tentar desativar instância banida no DB.`);
            }
        }
        else {
            pino_1.logger.error({ err: errMsg }, `[OutboundWorker] ❌ Falha catastrófica enviando msg para ${remoteJid} na instância ${instanceJid}`);
        }
        throw error; // Lança o erro para retornar pro BullMQ Retentar no Exponential Backoff (Cura Passiva)
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
