import 'dotenv/config';
import { prisma } from './packages/database/index';

async function main() {
    console.log('🌱 Seeding Trigger Rule para ORDER_PAID...');
    const store = await prisma.store.findFirst({ orderBy: { createdAt: 'asc' } });

    await prisma.triggerRule.create({
        data: {
            storeId: store!.id,
            name: 'Mensagem de Obrigado - 2min delay',
            eventType: 'ORDER_PAID',
            delayMinutes: 2,
            active: true,
        }
    });
    console.log('✅ Trigger Rule adicionada.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
