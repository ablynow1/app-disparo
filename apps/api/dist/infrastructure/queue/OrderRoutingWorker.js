"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRoutingWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../redis/redis");
const pino_1 = require("../logger/pino");
const database_1 = require("@app-disparo/database");
const RoutingService_1 = require("../../application/services/RoutingService");
const AIService_1 = require("../../application/services/AIService");
const EvolutionOutboundQueue_1 = require("./EvolutionOutboundQueue");
const routingService = new RoutingService_1.RoutingService();
exports.orderRoutingWorker = new bullmq_1.Worker('order-routing-queue', async (job) => {
    const { orderId, standardOrder, storeId } = job.data;
    pino_1.logger.info(`[OrderWorker] Orquestrando Regra para o Pedido DB interno ID: ${orderId} (Store: ${storeId})`);
    // 1. MAPEIA QUAL EVENTO É ESSE (Atenção: MVP Mock. Usar STATUS)
    let triggeredEvent;
    if (standardOrder.status === 'PENDING')
        triggeredEvent = 'PIX_PENDING';
    else if (standardOrder.status === 'PAID')
        triggeredEvent = 'ORDER_PAID';
    else
        triggeredEvent = 'ORDER_CANCELED'; // Fallback / Canceled
    // 1.5 ALGORITMO DE AUTO-DESTRUIÇÃO DE SPAM (Gargalo 4)
    // Se o cliente PAGOU o pedido agora, nós limpamos na fila qualquer cobrança pendente 
    // de PIX ou Carrinho que esteja aguardando no delay para não incomodá-lo.
    if (triggeredEvent === 'ORDER_PAID') {
        pino_1.logger.info(`[OrderWorker] Cliente pagou o Pedido ${orderId}. Cancelando cobranças pendentes na Fila...`);
        await EvolutionOutboundQueue_1.evolutionOutboundQueue.remove(`trigger-${orderId}-PIX_PENDING`);
        await EvolutionOutboundQueue_1.evolutionOutboundQueue.remove(`trigger-${orderId}-ABANDONED_CART`);
    }
    // 2. BUSCA A REGRA DO USUÁRIO E SUAS INSTÂNCIAS (Relação N:N e Roteamento)
    const activeRule = await database_1.prisma.triggerRule.findFirst({
        where: { eventType: triggeredEvent, active: true, storeId },
        include: { instances: true } // Inner Join mágico Prisma puxa os telefones
    });
    if (!activeRule) {
        pino_1.logger.warn(`Job ${job.id}: Nenhuma Regra de Disparo ATIVA configurada para o evento [${triggeredEvent}]. Ignorando.`);
        return; // Finaliza graciosamente "Pulando" o pedido
    }
    // 3. SE NÃO TEM WHATSAPP ATRELADO OU CONECTADO
    // A Redundância Ocorre Aqui: Filtramos apenas os pareados que estão 'open' no Banco!
    const activeInstances = activeRule.instances.filter((i) => i.status === 'open');
    const connectedJids = activeInstances.map((i) => i.remoteJid).filter(Boolean);
    if (connectedJids.length === 0) {
        throw new Error(`DELAY_RETRY: Regra [${activeRule.name}] está ativa mas não tem Nenhuma Instância conectada e 'open'! Aguardando retry na fila (Gargalo 2 Redundância)...`);
    }
    // 4. CHAMA O MOTOR ATÔMICO ROUND ROBIN (Redis INCR) PRA EVITAR BLOQUEIO
    const nextWhatsappInstance = await routingService.getNextInstance(activeRule.id, connectedJids);
    // 5. INTERPOLAÇÃO OU IA DINÂMICA (O CÉREBRO)
    let finalMessage = '';
    if (activeRule.agentId) {
        try {
            pino_1.logger.info(`[OrderWorker] Convocando o Cérebro IA [${activeRule.agentId}] para humanizar a mensagem...`);
            const aiService = new AIService_1.AIService(); // Instancia o Cérebro localmente
            finalMessage = await aiService.generateMessage(standardOrder, activeRule.agentId);
            pino_1.logger.info('[OrderWorker] 💡 Mensagem GPT-4 gerada com sucesso via RAG.');
        }
        catch (aiError) {
            pino_1.logger.warn({ err: aiError }, '[OrderWorker] ❌ Timeout ou Retorno Falho da OpeanAI. Ativando Modo Fallback (Template Estático).');
            // FAST FALLBACK SYSTEM: Manda mensagem chata p/ não perder o Time-to-Call da Venda!
            finalMessage = `Olá ${standardOrder.customerName}, vimos que seu pedido no valor de R$ ${standardOrder.totalAmount} encontra-se como ${standardOrder.status}! Seu telefone é ${standardOrder.customerPhone}.`;
        }
    }
    else {
        // fallback manual, template estático hard-coded mvp
        let messageTemplate = `Olá {nome}, vimos que seu pedido no valor de R$ {valor} encontra-se como {status}! Seu telefone é {telefone}.`;
        finalMessage = messageTemplate
            .replace('{nome}', standardOrder.customerName)
            .replace('{valor}', String(standardOrder.totalAmount))
            .replace('{status}', standardOrder.status)
            .replace('{telefone}', standardOrder.customerPhone);
    }
    // 6. ENFILEIRA PRA ÚLTIMA ETAPA (O CANHÃO OUTBOUND REAL DE API)
    // Adicionamos o Delay Nativo do Redis (Em Minutos convertidos p/ ms)
    const delayInMs = activeRule.delayMinutes * 60 * 1000;
    await EvolutionOutboundQueue_1.evolutionOutboundQueue.add(`send-whatsapp-${orderId}`, {
        instanceJid: nextWhatsappInstance,
        phoneDestination: standardOrder.customerPhone,
        text: finalMessage,
        orderId: orderId
    }, {
        jobId: `trigger-${orderId}-${triggeredEvent}`, // ID Fixo para permitir auto-cancelamento
        delay: delayInMs > 0 ? delayInMs : undefined
    });
    pino_1.logger.info(`[OrderWorker] ✅ Pedido Orquestrado com sucesso. A regra disparará magicamente pela Instância: ${nextWhatsappInstance} em ${activeRule.delayMinutes} minutos.`);
}, {
    connection: redis_1.sharedRedisConnection,
    concurrency: 50
});
exports.orderRoutingWorker.on('failed', (job, err) => {
    pino_1.logger.error(err, `[OrderWorker] Falha Global no processamento do Pedido ${job?.id}`);
});
