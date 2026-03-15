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
exports.EvolutionWebhookController = void 0;
const pino_1 = require("../../infrastructure/logger/pino");
const EvolutionWebhookQueue_1 = require("../../infrastructure/queue/EvolutionWebhookQueue");
const EvolutionWebhookValidator_1 = require("../validators/EvolutionWebhookValidator");
class EvolutionWebhookController {
    async handle(request, reply) {
        const payload = request.body;
        try {
            pino_1.logger.info({ event: payload.event, payload }, '➡️ [WEBHOOK RAW] Payload Recebido da Evolution');
            // 0. Tratar Evento de Sincronização de Conexão (Redundância)
            if (payload.event === 'connection.update') {
                const { EvolutionConnectionSchema } = await Promise.resolve().then(() => __importStar(require('../validators/EvolutionWebhookValidator')));
                const connData = EvolutionConnectionSchema.parse(payload);
                const state = connData.data.state || 'close'; // fallbacks pra closed se der ruim
                if (state === 'open' || state === 'close' || state === 'connecting') {
                    const { prisma } = await Promise.resolve().then(() => __importStar(require('@app-disparo/database')));
                    await prisma.instance.updateMany({
                        where: { name: connData.instance },
                        data: { status: state }
                    });
                    pino_1.logger.info(`📱 [Status Sync] Instância ${connData.instance} agora está marcada como ${state}.`);
                }
                return reply.status(200).send({ message: 'Sync connection state applied.' });
            }
            // 1. Somente lida se o evento for 'messages.upsert'
            // O Evolution API envia outros eventos, mas aqui no início focamos em mensagens recebidas
            if (payload.event !== 'messages.upsert') {
                const eventName = payload.event || 'Unknown Status';
                pino_1.logger.debug({ event: eventName }, 'Evento de Webhook ignorado pois não é uma mensagem de usuário');
                return reply.status(200).send({ message: `Ação não tratada para o evento: ${eventName}` });
            }
            // Validação Estrita dos dados
            const validatedData = EvolutionWebhookValidator_1.EvolutionMessageSchema.parse(payload);
            const isFromMe = validatedData.data.key.fromMe;
            // Se a mensagem for de nós mesmos, não queremos acionar robôs/loops
            if (isFromMe) {
                pino_1.logger.debug('Mensagem enviada por mim (fromMe), ignorando para não gerar looping.');
                return reply.status(200).send({ message: 'Ignore' });
            }
            const remoteJid = validatedData.data.key.remoteJid;
            // Garante que é uma DMs (1x1) e não grupo. Dependendo da regra de negócios, você pode remover esse `.endsWith`
            if (!remoteJid.endsWith('@s.whatsapp.net')) {
                pino_1.logger.debug({ jid: remoteJid }, 'Ignorando mensagem de grupo');
                return reply.status(200).send({ message: 'Grupo ignorado' });
            }
            // 2. Coloca os Dados Validados na Fila para processamento posterior
            await EvolutionWebhookQueue_1.evolutionWebhookQueue.add('process-incoming', validatedData);
            // 3. Responde imediatamente OK e Bypass do Localtunnel.
            return reply
                .header('bypass-tunnel-reminder', 'true')
                .status(200)
                .send({ message: 'Webhook Accepted and Queued for Processing' });
        }
        catch (error) {
            if (error.name === 'ZodError') {
                pino_1.logger.warn({ issues: error.issues }, 'Payload Webhook descartado na Validação Zod');
                // Ainda retornamos 200 pro Evolution para evitar loop de timeout, 
                // mas marcamos em log que algo não casou na estrutura da msg.
                return reply.status(200).send({ message: 'Invalid Format payload gracefully ignored' });
            }
            pino_1.logger.error({ err: error }, 'Erro Crítico no Controller Webhook (Evolution)');
            return reply.status(500).send({ message: 'Internal Server Error Error' });
        }
    }
}
exports.EvolutionWebhookController = EvolutionWebhookController;
