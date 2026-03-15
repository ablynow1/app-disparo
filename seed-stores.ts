import 'dotenv/config';
import { prisma } from './packages/database/index';

async function main() {
    console.log('🌱 Seeding initial stores...');

    let store1 = await prisma.store.findUnique({ where: { slug: 'loja-1' } });
    if (!store1) {
        store1 = await prisma.store.create({
            data: { name: 'Minha Loja Principal', slug: 'loja-1' }
        });
    }

    let store2 = await prisma.store.findUnique({ where: { slug: 'loja-2' } });
    if (!store2) {
        store2 = await prisma.store.create({
            data: { name: 'Loja Secundária (Freeshop)', slug: 'loja-2' }
        });
    }

    console.log('✅ Stores created/verified:');
    console.log(`- ${store1!.name} (ID: ${store1!.id})`);

    console.log('🔄 Backfilling existing records to Store 1...');

    await prisma.instance.updateMany({
        where: { storeId: null },
        data: { storeId: store1!.id }
    });

    await prisma.triggerRule.updateMany({
        where: { storeId: null },
        data: { storeId: store1!.id }
    });

    await prisma.aIAgent.updateMany({
        where: { storeId: null },
        data: { storeId: store1!.id }
    });

    await prisma.integration.updateMany({
        where: { storeId: null },
        data: { storeId: store1!.id }
    });

    console.log('✅ Backfill complete. All existing data is now isolated to Store 1.');
}

main()
    .catch((e) => {
        console.error('FATAL ERROR:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
