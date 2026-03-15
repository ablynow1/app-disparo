import { FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '../../infrastructure/logger/pino';
import { evolutionWebhookQueue } from '../../infrastructure/queue/EvolutionWebhookQueue';
import { EvolutionMessageSchema } from '../validators/EvolutionWebhookValidator';

export class EvolutionWebhookController {
  async handle(request: FastifyRequest, reply: FastifyReply) {
    const payload = request.body as any;

    try {
      logger.info({ event: payload.event, payload }, '➡️ [WEBHOOK RAW] Payload Recebido da Evolution');

      // 0. Tratar Evento de Sincronização de Conexão (Redundância)
      if (payload.event === 'connection.update') {
        const { EvolutionConnectionSchema } = await import('../validators/EvolutionWebhookValidator');
        const connData = EvolutionConnectionSchema.parse(payload);
        const state = connData.data.state || 'close'; // fallbacks pra closed se der ruim

        if (state === 'open' || state === 'close' || state === 'connecting') {
          const { prisma } = await import('@app-disparo/database');
          await prisma.instance.updateMany({
            where: { name: connData.instance },
            data: { status: state }
          });
          logger.info(`📱 [Status Sync] Instância ${connData.instance} agora está marcada como ${state}.`);
        }
        return reply.status(200).send({ message: 'Sync connection state applied.' });
      }

      // 1. Somente lida se o evento for 'messages.upsert'
      // O Evolution API envia outros eventos, mas aqui no início focamos em mensagens recebidas
      if (payload.event !== 'messages.upsert') {
        const eventName = payload.event || 'Unknown Status';
        logger.debug({ event: eventName }, 'Evento de Webhook ignorado pois não é uma mensagem de usuário');
        return reply.status(200).send({ message: `Ação não tratada para o evento: ${eventName}` });
      }

      // Validação Estrita dos dados
      const validatedData = EvolutionMessageSchema.parse(payload);
      const isFromMe = validatedData.data.key.fromMe;

      // Se a mensagem for de nós mesmos, não queremos acionar robôs/loops
      if (isFromMe) {
        logger.debug('Mensagem enviada por mim (fromMe), ignorando para não gerar looping.');
        return reply.status(200).send({ message: 'Ignore' });
      }

      const remoteJid = validatedData.data.key.remoteJid;
      // Garante que é uma DMs (1x1) e não grupo. Dependendo da regra de negócios, você pode remover esse `.endsWith`
      if (!remoteJid.endsWith('@s.whatsapp.net')) {
        logger.debug({ jid: remoteJid }, 'Ignorando mensagem de grupo');
        return reply.status(200).send({ message: 'Grupo ignorado' });
      }

      // 2. Coloca os Dados Validados na Fila para processamento posterior
      await evolutionWebhookQueue.add('process-incoming', validatedData);

      // 3. Responde imediatamente OK e Bypass do Localtunnel.
      return reply
        .header('bypass-tunnel-reminder', 'true')
        .status(200)
        .send({ message: 'Webhook Accepted and Queued for Processing' });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        logger.warn({ issues: error.issues }, 'Payload Webhook descartado na Validação Zod');
        // Ainda retornamos 200 pro Evolution para evitar loop de timeout, 
        // mas marcamos em log que algo não casou na estrutura da msg.
        return reply.status(200).send({ message: 'Invalid Format payload gracefully ignored' });
      }

      logger.error({ err: error }, 'Erro Crítico no Controller Webhook (Evolution)');
      return reply.status(500).send({ message: 'Internal Server Error Error' });
    }
  }
}

