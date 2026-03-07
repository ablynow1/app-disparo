"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecommerceWebhookRoutes = ecommerceWebhookRoutes;
const EcommerceWebhookController_1 = require("../controllers/EcommerceWebhookController");
const webhookSecurity_1 = require("../middlewares/webhookSecurity");
async function ecommerceWebhookRoutes(app) {
    const controller = new EcommerceWebhookController_1.EcommerceWebhookController();
    // Middleware Definitivo Global de Validação HMAC e Token para proteção Anti-Spoofing
    app.addHook('preHandler', webhookSecurity_1.verifyWebhookSignature);
    // Mapeamos a rota curinga que recolhe o provedor e a ID blindada de Inquilino do SaaS
    app.post('/api/webhooks/:platform/:integrationId', controller.handleIncomingWebhook.bind(controller));
}
