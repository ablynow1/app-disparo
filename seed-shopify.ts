import 'dotenv/config';
import { prisma } from './packages/database/index';

async function main() {
    const store = await prisma.store.findFirst({ orderBy: { createdAt: 'asc' } });

    let integration = await prisma.integration.create({
        data: { provider: 'SHOPIFY', active: true, storeId: store!.id, credentials: { token: 'hash-falso-cibernetico' } }
    });
    console.log('SHOP_ID=' + integration.id);
}
main().catch(console.error).finally(() => prisma.$disconnect());
