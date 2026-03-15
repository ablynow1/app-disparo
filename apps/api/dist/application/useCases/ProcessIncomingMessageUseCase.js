"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
            // Tenta achar a instância para herdar o StoreId
            const instanceDetailed = await database_1.prisma.instance.findFirst({
                where: { name: instanceName }
            });
            // ---------------------------------------------------------
            // PERSISTÊNCIA: Banco de Dados com Prisma Postgres
            // ---------------------------------------------------------
            const contact = await database_1.prisma.contact.upsert({
                where: { remoteJid },
                update: { pushName },
                create: {
                    remoteJid,
                    pushName,
                    storeId: instanceDetailed?.storeId
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
            // VERIFICAÇÃO DE CONTROLE MANUAL (PAUSA DA IA)
            // ---------------------------------------------------------
            if (contact.aiPaused) {
                pino_1.logger.info(`[UseCase] ⏸️ IA Pausada para o contato ${remoteJid}. Mensagem apenas registrada, sem disparo automático.`);
                return;
            }
            // ---------------------------------------------------------
            // DISPARO DA RESPOSTA AUTOMÁTICA!
            // ---------------------------------------------------------
            let respostaFinal = '';
            if (instanceDetailed && instanceDetailed.agentId) {
                try {
                    pino_1.logger.info(`[UseCase] Consultando Inteligência do Agente ${instanceDetailed.agentId} para responder.`);
                    const { AIService } = await Promise.resolve().then(() => __importStar(require('../services/AIService')));
                    const aiService = new AIService();
                    const history = await database_1.prisma.conversationLog.findMany({
                        where: { contactId: contact.id },
                        orderBy: { createdAt: 'desc' },
                        take: 12
                    });
                    // O RAG pede o historico em ordem cronologica (antiga -> nova)
                    const chronologicHistory = history.reverse();
                    respostaFinal = await aiService.generateInboundResponse(instanceDetailed.agentId, text, chronologicHistory.slice(0, -1)); // Tira a atual que já viaja na lib do gemini msg
                    pino_1.logger.info('[UseCase] 🧠 Resposta IA Encontrada com Contexto.');
                }
                catch (botErr) {
                    pino_1.logger.warn({ err: botErr }, '[UseCase] Falha no Motor IA Inbound. Ativando fallback.');
                    respostaFinal = `Olá! Recebemos sua mensagem, mas nossos atendentes (e a IA) estão temporariamente indisponíveis. Retornaremos em breve!`;
                }
            }
            else {
                // Sem agente configurado
                pino_1.logger.info(`[UseCase] Instância [${instanceName}] não possui Agente configurado. Respondendo Fixed Mock MVP.`);
                respostaFinal = `Olá ${pushName || ''}! Seu Inbound chegou blindado (Instância conectada: ${instanceName}). No entanto, essa instância não tem nenhuma IA conectada.`;
            }
            // Salva o Outbound na timeline do ZAP para registro
            await database_1.prisma.conversationLog.create({
                data: { text: respostaFinal, direction: 'OUTBOUND', contactId: contact.id }
            });
            pino_1.logger.info(`\n\n=========================================\n🤖 IA RESPONSE GERADA:\n${respostaFinal}\n=========================================\n\n`);
            try {
                await EvolutionApiService_1.EvolutionApiService.sendText(instanceName, remoteJid, respostaFinal);
            }
            catch (evoErr) {
                pino_1.logger.warn(`[UseCase] A API Evolution rejeitou o envio (Instância provavelmente não autorizada no Docker): ${evoErr.message}`);
            }
            pino_1.logger.info(`[UseCase] ✅ Ciclo completo para ${remoteJid}!`);
        }
        catch (error) {
            pino_1.logger.error({ err: error, msg: '[UseCase] Erro crítico ao processar mensagem.' });
            throw error;
        }
    }
}
exports.ProcessIncomingMessageUseCase = ProcessIncomingMessageUseCase;
