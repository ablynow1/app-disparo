import crypto from 'crypto';

// Setup de teste: Integração SHOPIFY mock
const SHOPIFY_WEBHOOK_SECRET = 'my_test_secret_123';
const INTEGRATION_ID = 'TEST_INTEGRATION_ID'; // Precisaremos pegar um ID real do DB na proxima rodada
const SHOPIFY_WEBHOOK_URL = `http://127.0.0.1:3333/api/webhooks/shopify/${INTEGRATION_ID}`;

async function fireShopifyWebhook() {
    const payload = {
        id: 9999998888,
        order_number: 1001,
        financial_status: 'paid', // Gera evento ORDER_PAID
        total_price: '199.99',
        customer: {
            first_name: 'João',
            last_name: 'Teste Silva',
            phone: '+55 11 99999-8877' // Numero do lead
        }
    };

    const rawBody = JSON.stringify(payload);

    // Algoritmo nativo da Shopify
    const hmac = crypto.createHmac('sha256', SHOPIFY_WEBHOOK_SECRET).update(rawBody, 'utf8').digest('base64');

    console.log(`🚀 Disparando Mock Shopify Webhook -> ${SHOPIFY_WEBHOOK_URL}`);

    try {
        const response = await fetch(SHOPIFY_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-shopify-hmac-sha256': hmac // Bypass do escudo anti-spoofing
            },
            body: rawBody
        });

        const data = await response.json();
        console.log(`📦 Resposta da API [${response.status}]:`, data);
    } catch (error: any) {
        console.error('❌ Falha na conexão:', error.message);
    }
}

fireShopifyWebhook();
