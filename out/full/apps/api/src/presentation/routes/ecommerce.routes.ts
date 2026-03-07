import { FastifyInstance } from 'fastify';
import { EcommerceWebhookController } from '../controllers/EcommerceWebhookController';
import { verifyWebhookSignature } from '../middlewares/webhookSecurity';

export async function ecommerceWebhookRoutes(app: FastifyInstance) {
  const controller = new EcommerceWebhookController();

  // Middleware Definitivo Global de Validação HMAC e Token para proteção Anti-Spoofing
  app.addHook('preHandler', verifyWebhookSignature);

  // Mapeamos a rota curinga que recolhe o provedor e a ID blindada de Inquilino do SaaS
  app.post('/api/webhooks/:platform/:integrationId', controller.handleIncomingWebhook.bind(controller));
}
