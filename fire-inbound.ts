import 'dotenv/config';

async function fireInboundWebhook() {
    const webhookUrl = 'http://127.0.0.1:3333/api/webhooks/evolution';
    const instanceName = 'vendas_oficial';

    const payload = {
        event: 'messages.upsert',
        instance: instanceName,
        data: {
            message: {
                conversation: 'Olá Inbound! Como vocês enviam os pedidos? Quanto tempo demora?'
            },
            key: {
                remoteJid: '5511999999999@s.whatsapp.net',
                fromMe: false,
                id: '1234567890ABCDEF'
            },
            pushName: 'Lead Simulação',
            messageType: 'conversation'
        }
    };

    try {
        console.log(`\n🚀 Enviando Inbound Simulado via Webhook para: ${webhookUrl}`);
        console.log(`📱 Instância alvo: ${instanceName}`);
        console.log(`📝 Texto: "${payload.data.message.conversation}"\n`);

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => null);
        console.log('✅ Resposta da API Gateway:', response.status, data);
    } catch (error: any) {
        console.error('❌ Network Error:', error.message);
    }
}

fireInboundWebhook();
