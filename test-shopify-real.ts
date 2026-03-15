import { prisma } from '@app-disparo/database';
import crypto from 'crypto';

async function fireShopifyWebhookWithRealDb() {
    console.log('🔍 Buscando a primeira integração Shopify ativa com Store...');
    const integration = await prisma.integration.findFirst({
        where: { provider: 'SHOPIFY', active: true },
        include: { store: true }
    });

    if (!integration) {
        console.error('❌ Nenhuma Integração Shopify ATIVA encontrada no Banco.');
        process.exit(1);
    }

    const credentials = integration.credentials as any;
    const SHOPIFY_WEBHOOK_SECRET = credentials?.token || 'test_secret_fallback';
    const SHOPIFY_WEBHOOK_URL = `http://127.0.0.1:3333/api/webhooks/shopify/${integration.id}`;

    const defaultPhone = '5511999990001'; // Numero válido p/ WhatsApp Evolution receber

    const payload = {
        id: Math.floor(Math.random() * 1000000),
        order_number: Math.floor(Math.random() * 10000),
        financial_status: 'paid', // Tão logo Pago, ele entra na Queue
        total_price: '499.50',
        customer: {
            first_name: 'Ana',
            last_name: 'Lead Teste',
            phone: defaultPhone
        }
    };

    const rawBody = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', SHOPIFY_WEBHOOK_SECRET).update(rawBody, 'utf8').digest('base64');

    console.log(`🚀 Disparando Mock para a Integração Genuína [${integration.id}] -> Loja: ${integration.store.name}`);

    try {
        const response = await fetch(SHOPIFY_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-shopify-hmac-sha256': hmac
            },
            body: rawBody
        });

        const data = await response.json();
        console.log(`📦 Resposta da API [${response.status}]:`, data);
    } catch (error: any) {
        console.error('❌ Falha na conexão:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fireShopifyWebhookWithRealDb();
