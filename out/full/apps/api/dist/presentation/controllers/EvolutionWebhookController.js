"use strict";
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
