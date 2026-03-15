import { Worker, Job } from 'bullmq';
import { sharedRedisConnection } from '../redis/redis';
import { logger } from '../logger/pino';
import { EvolutionApiService } from '../services/EvolutionApiService';

export interface SendWhatsappJobData {
  instanceJid: string;      // A Instância que enviará a mensagem
  phoneDestination: string; // O telefone do contato/cliente final
  text: string;             // Mensagem final já interpolada
  orderId?: string;         // Referência para Logs DB
}

export const evolutionOutboundWorker = new Worker<SendWhatsappJobData>(
  'evolution-outbound-queue',
  async (job: Job<SendWhatsappJobData>) => {
    const { instanceJid, phoneDestination, text, orderId } = job.data;

    logger.info(`[OutboundWorker] Preparando envio de mensagem via Instância [${instanceJid}] para o número [${phoneDestination}]${orderId ? ` (Pedido: ${orderId})` : ''}`);

    // Removendo traços e espaços, e aplicando o prefixo @s.whatsapp.net se necessário
    const cleanPhone = phoneDestination.replace(/\D/g, '');
    const remoteJid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;

    try {
      // 1. LIMITADOR DE TAXA ANTI-BAN (RATE LIMITER via Redis)
      // Mantendo o limite conservador de max 15 mensagens por MINUTO por aparelho WhatsApp (Chip Seguro)
      const MAX_MSGS_PER_MINUTE = 15;
      const rateLimitKey = `rate_limit:instance:${instanceJid}`;

      const currentCount = await typeof sharedRedisConnection.incr === 'function'
        ? await sharedRedisConnection.incr(rateLimitKey)
        : 1;

      if (currentCount === 1 && typeof sharedRedisConnection.expire === 'function') {
        await sharedRedisConnection.expire(rateLimitKey, 60); // Janela móvel de 60 segundos
      }

      if (currentCount > MAX_MSGS_PER_MINUTE) {
        logger.warn(`[OutboundWorker] 🚨 RATE LIMIT EXCEDIDO para Instância [${instanceJid}]. Encaminhando para Backoff Exponencial Seguro.`);
        // Thrown error volta o Job para a Fila com Exponential Backoff
        throw new Error('RATE_LIMIT_EXCEEDED');
      }

      // 2. HUMANIZAÇÃO: Insere um Delay (Atraso) Aleatório entre 2s e 5s
      const delayMs = Math.floor(Math.random() * (5000 - 2000 + 1) + 2000);
      logger.info(`[OutboundWorker] ⏱️ Simulando digitação humana na instância [${instanceJid}]. Aguardando ${delayMs}ms antes do disparo...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));

      // 3. ENVELOPE: Chama o Service da API Dinamicamente com o Roteador Balanceado
      await EvolutionApiService.sendText(instanceJid, remoteJid, text);

      logger.info(`[OutboundWorker] ✅ Mensagem enviada com sucesso para ${remoteJid}`);
    } catch (error: any) {
      const errMsg = error.message || String(error);

      // 4. DETECTOR DE QUEDA/BANIMENTO
      if (
        errMsg.toLowerCase().includes('403') ||
        errMsg.toLowerCase().includes('not connected') ||
        errMsg.toLowerCase().includes('disconnect') ||
        errMsg.toLowerCase().includes('unauthorized') ||
        errMsg.toLowerCase().includes('not exist')
      ) {
        logger.error(`[OutboundWorker] ☠️ WhatsApp APAGÃO Detectado! Instância [${instanceJid}] será DESATIVADA do Roteador.`);
        try {
          // Desconecta a instância p/ impedir envio de novas buchas
          await prisma.instance.updateMany({
            where: { name: instanceJid },
            data: { status: 'disconnected' }
          });
        } catch (dbErr) {
          logger.error({ err: dbErr }, `[OutboundWorker] Falha ao tentar desativar instância banida no DB.`);
        }
      } else {
        logger.error({ err: errMsg }, `[OutboundWorker] ❌ Falha catastrófica enviando msg para ${remoteJid} na instância ${instanceJid}`);
      }

      throw error; // Lança o erro para retornar pro BullMQ Retentar no Exponential Backoff (Cura Passiva)
    }
  },
  {
    connection: sharedRedisConnection as any,
    concurrency: 50 // Tuning O(1): 50 disparos simultâneos não-bloqueantes WhatsApp
  }
);

import { prisma } from '@app-disparo/database';

evolutionOutboundWorker.on('failed', async (job, err) => {
  logger.error(err, `[OutboundWorker] JOB FALHOU (Id: ${job?.id}, Tentativa: ${job?.attemptsMade}/${job?.opts.attempts}) Motivo: ${err.message}`);

  // Se o Job esgotou todas as tentativas (ex: atingiu as 5 permitidas) vira uma DLQ (Dead Letter)
  if (job && job.attemptsMade >= (job.opts.attempts || 5)) {
    const { orderId, phoneDestination } = job.data;

    logger.error(`[DLQ] 🪦 O Job ${job.id} esgotou TODAS as tentativas e Morreu.`);

    if (orderId) {
      try {
        // Salva a auditoria da Falha Irreversível no Banco do Lojista (Painel)
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'FAILED_TO_SEND' }
        });
        logger.info(`[DLQ] Status do Pedido ${orderId} atualizado para FAILED_TO_SEND com sucesso.`);
      } catch (dbError) {
        logger.error({ err: dbError }, `[DLQ] Falha dupla! Não conseguiu atualizar o pedido ${orderId} para FAILED no Prisma.`);
      }
    } else {
      logger.warn(`[DLQ] Job ${job.id} não possui um orderId para rastreio no banco (ex: disparo avulso). Telefone afetado: ${phoneDestination}`);
    }
  }
});
