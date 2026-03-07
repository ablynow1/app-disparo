"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecommerceAuthMiddleware = ecommerceAuthMiddleware;
async function ecommerceAuthMiddleware(request, reply) {
    // A URL indica qual plataforma estamos tratando: /api/webhooks/shopify, /api/webhooks/yampi, etc.
    const path = request.routerPath;
    if (path.includes('shopify')) {
        // Shopify envia HMAC base64 assinado com o secret no header 'x-shopify-hmac-sha256'
        const hmacHeader = request.headers['x-shopify-hmac-sha256'];
        if (!hmacHeader) {
            return reply.status(401).send({ error: 'Unauthorized: Missing Shopify HMAC' });
        }
        // Lógica real validaria o raw body com crypto.createHmac. 
        // Para efeito didático e testes em dev, aceitaremos provisoriamente.
        // request.log.info('Shopify Secret Validado provisoriamente.');
    }
    else if (path.includes('yampi')) {
        // Yampi envia um token simples no header 'x-yampi-token'
        const token = request.headers['x-yampi-token'] || request.query.token;
        if (!token) {
            return reply.status(401).send({ error: 'Unauthorized: Missing Yampi Token' });
        }
    }
    else if (path.includes('appmax')) {
        // Appmax também envia token em query parameters geralmente (access_token)
        const token = request.query.access_token || request.query.token;
        if (!token) {
            return reply.status(401).send({ error: 'Unauthorized: Missing Appmax Token' });
        }
    }
}
