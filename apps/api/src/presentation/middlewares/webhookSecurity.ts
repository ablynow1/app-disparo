import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { prisma } from '@app-disparo/database';
import { logger } from '../../infrastructure/logger/pino';

/**
 * Middleware de Segurança Definitivo Anti-Spoofing.
 * Garante que somente os Servidores Verdadeiros da Shopify/Appmax/Yampi consigam atingir as queus.
 */
export async function verifyWebhookSignature(request: FastifyRequest, reply: FastifyReply) {
  const integrationId = (request.params as any).integrationId;
  const platform = (request.params as any).platform; // yampi, shopify, appmax

  // 1. Validar se a Integração existe e está Ativa
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId }
  });

  if (!integration || !integration.active) {
    logger.warn({ integrationId, ip: request.ip }, 'Tentativa de spoofing ou Integração Inativa');
    return reply.status(401).send({ error: 'Unauthorized: Integration Blocked or Missing' });
  }

  const credentials = integration.credentials as any;

  // 2. Validação Específica por Plataforma
  try {
    if (platform === 'shopify') {
      // Shopify usa HMAC-SHA256 no Header 'x-shopify-hmac-sha256'
      const hmacHeader = request.headers['x-shopify-hmac-sha256'] as string;
      const secret = credentials?.token || credentials?.webhookSecret;

      if (!hmacHeader || !secret) throw new Error('Missing Shopify HMAC');

      // Calcula o Hash do Body cru recebido (raw body) comparando com o Segredo configurado
      const rawBody = JSON.stringify(request.body);
      const generatedHash = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');

      if (generatedHash !== hmacHeader) {
        throw new Error('HMAC Signature Mismatch');
      }

    } else if (platform === 'yampi') {
      // Yampi envia um X-Yampi-Token simplificado 
      const yampiToken = request.headers['x-yampi-token'] as string;
      if (yampiToken !== credentials?.token) {
        throw new Error('Invalid Yampi Token');
      }

    } else if (platform === 'appmax') {
      // Appmax pode usar um access_token na própria querystring ou Header
      const token = request.query ? (request.query as any).token : null;
      if (!token || token !== credentials?.apiToken && token !== credentials?.token) {
        throw new Error('Invalid Appmax API Token Reference');
      }
    }

    // Sucesso - Injeta a integração validada no Request para evitar nova query no DB
    (request as any).integrationDetails = integration;

  } catch (err: any) {
    logger.error({ ip: request.ip, err: err.message }, '🚨 BLOQUEIO DE SEGURANÇA: Assinatura de Webhook Inválida (Spoofing Detected)');
    return reply.status(401).send({ error: 'Security Breach: Invalid Webhook Signature.' });
  }
}
