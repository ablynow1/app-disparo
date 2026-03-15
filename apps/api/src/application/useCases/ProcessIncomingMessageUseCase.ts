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

      // Tenta achar a instância para herdar o StoreId
      const instanceDetailed = await prisma.instance.findFirst({
        where: { name: instanceName }
      });

      // ---------------------------------------------------------
      // PERSISTÊNCIA: Banco de Dados com Prisma Postgres
      // ---------------------------------------------------------
      const contact = await prisma.contact.upsert({
        where: { remoteJid },
        update: { pushName },
        create: {
          remoteJid,
          pushName,
          storeId: instanceDetailed?.storeId
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
      // VERIFICAÇÃO DE CONTROLE MANUAL (PAUSA DA IA)
      // ---------------------------------------------------------
      if (contact.aiPaused) {
        logger.info(`[UseCase] ⏸️ IA Pausada para o contato ${remoteJid}. Mensagem apenas registrada, sem disparo automático.`);
        return;
      }

      // ---------------------------------------------------------
      // DISPARO DA RESPOSTA AUTOMÁTICA!
      // ---------------------------------------------------------
      let respostaFinal = '';

      if (instanceDetailed && instanceDetailed.agentId) {
        try {
          logger.info(`[UseCase] Consultando Inteligência do Agente ${instanceDetailed.agentId} para responder.`);
          const { AIService } = await import('../services/AIService');
          const aiService = new AIService();

          const history = await prisma.conversationLog.findMany({
            where: { contactId: contact.id },
            orderBy: { createdAt: 'desc' },
            take: 12
          });

          // O RAG pede o historico em ordem cronologica (antiga -> nova)
          const chronologicHistory = history.reverse();

          respostaFinal = await aiService.generateInboundResponse(instanceDetailed.agentId, text, chronologicHistory.slice(0, -1)); // Tira a atual que já viaja na lib do gemini msg
          logger.info('[UseCase] 🧠 Resposta IA Encontrada com Contexto.');
        } catch (botErr) {
          logger.warn({ err: botErr }, '[UseCase] Falha no Motor IA Inbound. Ativando fallback.');
          respostaFinal = `Olá! Recebemos sua mensagem, mas nossos atendentes (e a IA) estão temporariamente indisponíveis. Retornaremos em breve!`;
        }
      } else {
        // Sem agente configurado
        logger.info(`[UseCase] Instância [${instanceName}] não possui Agente configurado. Respondendo Fixed Mock MVP.`);
        respostaFinal = `Olá ${pushName || ''}! Seu Inbound chegou blindado (Instância conectada: ${instanceName}). No entanto, essa instância não tem nenhuma IA conectada.`;
      }

      // Salva o Outbound na timeline do ZAP para registro
      await prisma.conversationLog.create({
        data: { text: respostaFinal, direction: 'OUTBOUND', contactId: contact.id }
      });

      logger.info(`\n\n=========================================\n🤖 IA RESPONSE GERADA:\n${respostaFinal}\n=========================================\n\n`);

      try {
        await EvolutionApiService.sendText(instanceName, remoteJid, respostaFinal);
      } catch (evoErr: any) {
        logger.warn(`[UseCase] A API Evolution rejeitou o envio (Instância provavelmente não autorizada no Docker): ${evoErr.message}`);
      }
      logger.info(`[UseCase] ✅ Ciclo completo para ${remoteJid}!`);

    } catch (error) {
      logger.error({ err: error, msg: '[UseCase] Erro crítico ao processar mensagem.' });
      throw error;
    }
  }
}
