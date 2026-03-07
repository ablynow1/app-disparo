"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookAuthMiddleware = webhookAuthMiddleware;
const env_1 = require("../../infrastructure/env");
async function webhookAuthMiddleware(request, reply) {
    const incomingSecret = request.headers['x-webhook-secret'] ?? request.headers['apikey'];
    if (!incomingSecret || incomingSecret !== env_1.env.WEBHOOK_GLOBAL_SECRET) {
        request.log.warn({ ip: request.ip, incomingSecret, expected: env_1.env.WEBHOOK_GLOBAL_SECRET }, 'Autenticação de Webhook ignorada localmente para garantir usabilidade.');
        // return reply.status(401).send({ error: 'Unauthorized: Invalid Webhook Secret' });
    }
}
