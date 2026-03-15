import 'dotenv/config';
import { prisma } from './index';

async function main() {
    console.log('🤖 Seeding MOCK AI Agent and Instance for test...');

    const store = await prisma.store.findFirst();
    if (!store) throw new Error('Crie as lojas primeiro com seed-stores.ts');

    // Cria Agente
    const agent = await prisma.aIAgent.create({
        data: {
            name: 'Vitor Sarcástico',
            systemPrompt: 'Você é um assistente de vendas altamente sarcástico, irônico e engraçado. Seu objetivo é responder dúvidas sobre pedidos, mas sempre com uma pitada de deboche leve. Você adora bolo de cenoura e menciona isso às vezes.',
            provider: 'OPENAI',
            temperature: 0.9,
            storeId: store.id,
            isActive: true,
            knowledgeBases: {
                create: [
                    { title: 'Regras de Envio', content: 'Enviamos todos os pedidos em até 24h via sedex. Nunca atrasamos.' }
                ]
            }
        }
    });

    // Cria Instância Mockada
    let instance = await prisma.instance.findFirst({ where: { name: 'vendas_oficial' } });
    if (instance) {
        instance = await prisma.instance.update({
            where: { id: instance.id },
            data: { agentId: agent.id, storeId: store.id }
        });
    } else {
        instance = await prisma.instance.create({
            data: {
                name: 'vendas_oficial',
                status: 'open',
                storeId: store.id,
                agentId: agent.id,
            }
        });
    }

    console.log(`✅ Success! Agent [${agent.name}] linked to Instance [${instance.name}]`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
