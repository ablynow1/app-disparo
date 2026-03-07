"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessIncomingMessageUseCase = void 0;
const pino_1 = require("../../infrastructure/logger/pino");
const EvolutionApiService_1 = require("../../infrastructure/services/EvolutionApiService");
const database_1 = require("@app-disparo/database");
class ProcessIncomingMessageUseCase {
    async execute(messageData) {
        try {
            pino_1.logger.info({ msg: '[UseCase] Iniciando processamento da mensagem...', messageData });
            const remoteJid = messageData.data?.key?.remoteJid || messageData.remoteJid;
            const pushName = messageData.data?.pushName || messageData.pushName;
            const instanceName = messageData.instance || 'default_instance';
            const text = messageData.data?.message?.conversation
                || messageData.data?.message?.extendedTextMessage?.text
                || messageData.text;
            if (!text) {
                pino_1.logger.warn(`[UseCase] Mensagem de ${remoteJid} ignorada (não é texto).`);
                return;
            }
            pino_1.logger.info(`[UseCase] 📩 Mensagem de ${pushName || 'Desconhecido'} (${remoteJid}) via [${instanceName}]: "${text}"`);
            // ---------------------------------------------------------
            // PERSISTÊNCIA: Banco de Dados com Prisma Postgres
            // ---------------------------------------------------------
            const contact = await database_1.prisma.contact.upsert({
                where: { remoteJid },
                update: { pushName },
                create: {
                    remoteJid,
                    pushName,
                },
            });
            await database_1.prisma.conversationLog.create({
                data: {
                    text,
                    direction: 'INBOUND',
                    contactId: contact.id,
                },
            });
            pino_1.logger.info(`[UseCase] 💾 Histórico salvo com sucesso no banco.`);
            // ---------------------------------------------------------
            // DISPARO DA RESPOSTA AUTOMÁTICA!
            // ---------------------------------------------------------
            const respostaBot = `Olá ${pushName || ''}! Seu Inbound chegou blindado com Zod Strict e Segurança no Gateway (Instância conectada: ${instanceName}). A inteligência processou com a evolução da Fase 7! 🛡️🚀`;
            await EvolutionApiService_1.EvolutionApiService.sendText(instanceName, remoteJid, respostaBot);
            pino_1.logger.info(`[UseCase] ✅ Ciclo completo para ${remoteJid}!`);
        }
        catch (error) {
            pino_1.logger.error({ err: error, msg: '[UseCase] Erro crítico ao processar mensagem.' });
            throw error;
        }
    }
}
exports.ProcessIncomingMessageUseCase = ProcessIncomingMessageUseCase;
