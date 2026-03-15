import 'dotenv/config';

async function spamWebhook() {
    const webhookUrl = 'http://127.0.0.1:3333/api/webhooks/evolution';
    const instanceName = 'vendas_oficial';

    console.log('🔥 Iniciando Ataque (20 Webhooks simultâneos para simular Pico de Vendas e testar Limitador de Rota)');

    const promises = [];

    for (let i = 1; i <= 20; i++) {
        const payload = {
            event: 'messages.upsert',
            instance: instanceName,
            data: {
                message: {
                    conversation: `Mensagem de Teste em Lote #${i}`
                },
                key: {
                    remoteJid: `55119999900${i.toString().padStart(2, '0')}@s.whatsapp.net`,
                    fromMe: false,
                    id: `BATCH_${i}`
                },
                pushName: `Lead ${i}`,
                messageType: 'conversation'
            }
        };

        promises.push(
            fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(r => console.log(`[Webhook ${i}] Enviado! Status: ${r.status}`))
                .catch((e: any) => console.log(`[Webhook ${i}] Falha de Rede: ${e.message}`))
        );
    }

    await Promise.all(promises);
    console.log('🎯 Chuva de Webhooks Finalizada!');
}

spamWebhook();
