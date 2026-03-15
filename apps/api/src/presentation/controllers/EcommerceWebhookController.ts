import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '@app-disparo/database';
import { orderRoutingQueue } from '../../infrastructure/queue/OrderRoutingQueue';
import { normalizeYampiPayload } from '../../application/adapters/yampi.adapter';
import { normalizeShopifyPayload } from '../../application/adapters/shopify.adapter';
import { normalizeAppmaxPayload } from '../../application/adapters/appmax.adapter';

export class EcommerceWebhookController {

  // Endpoint Central para os Webhooks
  async handleIncomingWebhook(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as any;
    const path = request.routerPath;
    let standardOrder;

    // Agora o Integration ID obrigatoriamente vem mapeado da URL blindada
    let integrationId = params.integrationId;
    let integrationDetails = (request as any).integrationDetails;
    let storeId = integrationDetails?.storeId;

    if (!storeId) {
      request.log.warn(`Webhook bloqueado: Integração ${integrationId} não tem loja vinculada.`);
      return reply.status(400).send({ error: 'Integração órfã' });
    }

    // 1. FAST ATOMIC RESPONSE (Fire and Forget)
    // Devolvemos 200 OK no milissegundo 0 para o E-commerce!
    reply.status(200).send({
      received: true,
      status: 'processing_in_background'
    });

    // 2. DELEGAÇÃO BACKGROUND (Sem prender a request)
    // Emcapsulado em uma IIFE assíncrona para pegar erros sem derrubar o processo
    (async () => {
      try {
        let standardOrder;

        // 2.1 ADAPTERS (Tradução e Mapeamento)
        const platform = params.platform;
        if (platform === 'yampi') {
          standardOrder = normalizeYampiPayload(request.body);
        } else if (platform === 'shopify') {
          standardOrder = normalizeShopifyPayload(request.body);
        } else if (platform === 'appmax') {
          standardOrder = normalizeAppmaxPayload(request.body);
        } else {
          request.log.warn(`Webhook Error: Provedor desconhecido [${platform}]`);
          return;
        }

        // Se a plataforma enviou lixo sem ID, não prossegue
        if (!standardOrder.externalOrderId || standardOrder.externalOrderId === 'undefined') {
          request.log.info({ msg: 'Webhook Ignorado (Sem ID no Pedido)', standardOrder });
          return;
        }

        // 2.2 PERSISTÊNCIA IDEMPOTENTE
        const order = await prisma.order.upsert({
          where: {
            integrationId_externalOrderId: {
              integrationId: integrationId,
              externalOrderId: standardOrder.externalOrderId
            }
          },
          update: {
            status: standardOrder.status,
            payload: standardOrder.originalPayload,
          },
          create: {
            externalOrderId: standardOrder.externalOrderId,
            customerName: standardOrder.customerName,
            customerPhone: standardOrder.customerPhone,
            amount: standardOrder.totalAmount,
            status: standardOrder.status,
            payload: standardOrder.originalPayload,
            integrationId: integrationId
          }
        });

        // 2.3 BULLMQ DELEGAÇÃO PROFUNDA
        await orderRoutingQueue.add('process-ecom-rule', {
          orderId: order.id,
          standardOrder,
          storeId
        }, {
          jobId: `ecom-${standardOrder.integrationProvider}-${standardOrder.externalOrderId}-${order.status}`
        });

        request.log.info(`[Background Webhook] Order ${order.id} processada silenciosamente e enfileirada no Redis.`);

      } catch (backgroundErr) {
        // Apenas logamos, pois a resposta 200 já foi enviada
        request.log.error(backgroundErr, `[Background Webhook Error - Fatal] Falha ao processar Order.`);
      }
    })();
  }
}
