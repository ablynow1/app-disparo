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
      // Chama o Service da API Dinamicamente com o Roteador Balanceado
      await EvolutionApiService.sendText(instanceJid, remoteJid, text);
      
      logger.info(`[OutboundWorker] ✅ Mensagem enviada com sucesso para ${remoteJid}`);
    } catch (error: any) {
      logger.error({ err: error.message }, `[OutboundWorker] ❌ Falha catastrófica ao enviar mensagem para ${remoteJid} na instância ${instanceJid}`);
      throw error; // Lança o erro para o BullMQ tentar novamente no exponential backoff
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
