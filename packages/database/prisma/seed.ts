import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });

async function main() {
    console.log('🌱 Seeding initial stores...');

    // Create store 1 (Default for existing records)
    const store1 = await prisma.store.upsert({
        where: { slug: 'loja-1' },
        update: {},
        create: {
            name: 'Minha Loja Principal',
            slug: 'loja-1',
        },
    });

    // Create store 2
    const store2 = await prisma.store.upsert({
        where: { slug: 'loja-2' },
        update: {},
        create: {
            name: 'Loja Secundária (Freeshop)',
            slug: 'loja-2',
        },
    });

    console.log('✅ Stores created/verified:');
    console.log(`- ${store1.name} (ID: ${store1.id})`);
    console.log(`- ${store2.name} (ID: ${store2.id})`);

    // Backfill existing records to Store 1 if they have no store
    console.log('🔄 Backfilling existing records to Store 1...');

    await prisma.instance.updateMany({
        where: { storeId: null },
        data: { storeId: store1.id }
    });

    await prisma.triggerRule.updateMany({
        where: { storeId: null },
        data: { storeId: store1.id }
    });

    await prisma.aIAgent.updateMany({
        where: { storeId: null },
        data: { storeId: store1.id }
    });

    await prisma.integration.updateMany({
        where: { storeId: null },
        data: { storeId: store1.id }
    });

    console.log('✅ Backfill complete. All existing data is now isolated to Store 1.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
