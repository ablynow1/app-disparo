"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRoutes = webhookRoutes;
const EvolutionWebhookController_1 = require("../controllers/EvolutionWebhookController");
const webhookAuthMiddleware_1 = require("../middlewares/webhookAuthMiddleware");
async function webhookRoutes(app) {
    const controller = new EvolutionWebhookController_1.EvolutionWebhookController();
    const handler = async (request, reply) => {
        return controller.handle(request, reply);
    };
    app.post('/webhooks/evolution', { preHandler: [webhookAuthMiddleware_1.webhookAuthMiddleware] }, handler);
    app.post('/webhooks/evolution/*', { preHandler: [webhookAuthMiddleware_1.webhookAuthMiddleware] }, handler);
}
