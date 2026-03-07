"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWebhookSignature = verifyWebhookSignature;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("@app-disparo/database");
const pino_1 = require("../../infrastructure/logger/pino");
/**
 * Middleware de Segurança Definitivo Anti-Spoofing.
 * Garante que somente os Servidores Verdadeiros da Shopify/Appmax/Yampi consigam atingir as queus.
 */
async function verifyWebhookSignature(request, reply) {
    const integrationId = request.params.integrationId;
    const platform = request.params.platform; // yampi, shopify, appmax
    // 1. Validar se a Integração existe e está Ativa
    const integration = await database_1.prisma.integration.findUnique({
        where: { id: integrationId }
    });
    if (!integration || !integration.active) {
        pino_1.logger.warn({ integrationId, ip: request.ip }, 'Tentativa de spoofing ou Integração Inativa');
        return reply.status(401).send({ error: 'Unauthorized: Integration Blocked or Missing' });
    }
    const credentials = integration.credentials;
    // 2. Validação Específica por Plataforma
    try {
        if (platform === 'shopify') {
            // Shopify usa HMAC-SHA256 no Header 'x-shopify-hmac-sha256'
            const hmacHeader = request.headers['x-shopify-hmac-sha256'];
            const secret = credentials?.webhookSecret;
            if (!hmacHeader || !secret)
                throw new Error('Missing Shopify HMAC');
            // Calcula o Hash do Body cru recebido (raw body) comparando com o Segredo configurado
            const rawBody = JSON.stringify(request.body);
            const generatedHash = crypto_1.default.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
            if (generatedHash !== hmacHeader) {
                throw new Error('HMAC Signature Mismatch');
            }
        }
        else if (platform === 'yampi') {
            // Yampi envia um X-Yampi-Token simplificado 
            const yampiToken = request.headers['x-yampi-token'];
            if (yampiToken !== credentials?.token) {
                throw new Error('Invalid Yampi Token');
            }
        }
        else if (platform === 'appmax') {
            // Appmax pode usar um access_token na própria querystring ou Header
            const token = request.query ? request.query.token : null;
            if (!token || token !== credentials?.apiToken) {
                throw new Error('Invalid Appmax API Token Reference');
            }
        }
    }
    catch (err) {
        pino_1.logger.error({ ip: request.ip, err: err.message }, '🚨 BLOQUEIO DE SEGURANÇA: Assinatura de Webhook Inválida (Spoofing Detected)');
        return reply.status(401).send({ error: 'Security Breach: Invalid Webhook Signature.' });
    }
}
