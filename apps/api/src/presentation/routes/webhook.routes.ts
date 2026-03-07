import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EvolutionWebhookController } from '../controllers/EvolutionWebhookController';
import { webhookAuthMiddleware } from '../middlewares/webhookAuthMiddleware';

export async function webhookRoutes(app: FastifyInstance) {
  const controller = new EvolutionWebhookController();

  const handler = async (request: FastifyRequest, reply: FastifyReply) => {
    return controller.handle(request, reply);
  };

  app.post(
    '/webhooks/evolution',
    { preHandler: [webhookAuthMiddleware] },
    handler
  );

  app.post(
    '/webhooks/evolution/*',
    { preHandler: [webhookAuthMiddleware] },
    handler
  );
}
