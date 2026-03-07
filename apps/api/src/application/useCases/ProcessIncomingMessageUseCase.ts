import { logger } from '../../infrastructure/logger/pino'; 
import { EvolutionApiService } from '../../infrastructure/services/EvolutionApiService';
import { prisma } from '@app-disparo/database';

export class ProcessIncomingMessageUseCase {
  async execute(messageData: any): Promise<void> {
    try {
      logger.info({ msg: '[UseCase] Iniciando processamento da mensagem...', messageData });
      
      const remoteJid = messageData.data?.key?.remoteJid || messageData.remoteJid;
      const pushName = messageData.data?.pushName || messageData.pushName;
      const instanceName = messageData.instance || 'default_instance';
      
      const text = messageData.data?.message?.conversation 
                 || messageData.data?.message?.extendedTextMessage?.text
                 || messageData.text;

      if (!text) {
         logger.warn(`[UseCase] Mensagem de ${remoteJid} ignorada (não é texto).`);
         return;
      }
      
      logger.info(`[UseCase] 📩 Mensagem de ${pushName || 'Desconhecido'} (${remoteJid}) via [${instanceName}]: "${text}"`);

      // ---------------------------------------------------------
      // PERSISTÊNCIA: Banco de Dados com Prisma Postgres
      // ---------------------------------------------------------
      const contact = await prisma.contact.upsert({
        where: { remoteJid },
        update: { pushName },
        create: {
          remoteJid,
          pushName,
        },
      });

      await prisma.conversationLog.create({
        data: {
          text,
          direction: 'INBOUND',
          contactId: contact.id,
        },
      });

      logger.info(`[UseCase] 💾 Histórico salvo com sucesso no banco.`);
      
      // ---------------------------------------------------------
      // DISPARO DA RESPOSTA AUTOMÁTICA!
      // ---------------------------------------------------------
      const respostaBot = `Olá ${pushName || ''}! Seu Inbound chegou blindado com Zod Strict e Segurança no Gateway (Instância conectada: ${instanceName}). A inteligência processou com a evolução da Fase 7! 🛡️🚀`;
      
      await EvolutionApiService.sendText(instanceName, remoteJid, respostaBot);
      
      logger.info(`[UseCase] ✅ Ciclo completo para ${remoteJid}!`);
      
    } catch (error) {
      logger.error({ err: error, msg: '[UseCase] Erro crítico ao processar mensagem.' });
      throw error; 
    }
  }
}


