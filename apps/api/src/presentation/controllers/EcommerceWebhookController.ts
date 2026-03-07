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
    
    // 1. ADAPTERS (Tradução e Mapeamento)
    try {
      if (path.includes('yampi')) {
        standardOrder = normalizeYampiPayload(request.body);
      } else if (path.includes('shopify')) {
        standardOrder = normalizeShopifyPayload(request.body);
      } else if (path.includes('appmax')) {
        standardOrder = normalizeAppmaxPayload(request.body);
      } else {
        return reply.status(400).send({ error: 'Provedor desconhecido' });
      }
    } catch (err) {
      request.log.error(err, 'Falha ao normalizar Webhook (Adapter Error)');
      return reply.status(400).send({ error: 'Payload Invalido' });
    }

    // Se a plataforma enviou lixo sem ID, não prossegue
    if (!standardOrder.externalOrderId || standardOrder.externalOrderId === 'undefined') {
      return reply.status(200).send({ message: 'Ignorado (Sem ID no Pedido)' });
    }

    // 2. PERSISTÊNCIA IDEMPOTENTE NATIVA (PRISMA UNIQUE INDEX)
    try {
      // Usa .upsert() em vez de .create(). Se uma plataforma mandar o mesmo evento do mesmo pedido 200x,
      // essa query irá apenas atualizar silenciosamente ao invés de explodir o banco.
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

      // 3. BULLMQ DELEGAÇÃO: Entrega pesada para workers em background
      await orderRoutingQueue.add('process-ecom-rule', {
        orderId: order.id,
        standardOrder
      }, {
        jobId: `ecom-${standardOrder.integrationProvider}-${standardOrder.externalOrderId}-${order.status}` // Evita reprocessar na mesma fila
      });

      // 4. ESTATÍSTICA IMEDIATA: Fastify solta 200 e finaliza TCP Handshake o mais rápido possível!
      return reply.status(200).send({ 
        received: true, 
        orderId: order.id,
        normalizedStatus: standardOrder.status 
      });

    } catch (error) {
      request.log.error(error, `[Webhook Error - ${standardOrder.integrationProvider}] Fallback.`);
      // Retorna 500 rápido para que a plataforma ative os retries nativos deles.
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  }
}
