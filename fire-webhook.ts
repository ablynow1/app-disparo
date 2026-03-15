import crypto from 'crypto';

async function fireTestWebhook() {
    const secret = 'hash-falso-cibernetico';
    const integrationId = 'cmmqtowdk0001ospqkfd5dkhp'; // Generated earlier

    const payload = {
        id: "TEST-002",
        total_price: "199.90",
        customer: {
            first_name: "John",
            phone: "5511999999999"
        },
        financial_status: "paid"
    };

    const rawBody = JSON.stringify(payload);

    const hash = crypto
        .createHmac('sha256', secret)
        .update(rawBody, 'utf8')
        .digest('base64');

    console.log(`Sending webhook with HMAC: ${hash}`);

    try {
        const res = await fetch(`http://localhost:3333/api/webhooks/shopify/${integrationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Hmac-Sha256': hash
            },
            body: rawBody
        });

        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Response: ${text}`);
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

fireTestWebhook();
