import 'dotenv/config';
import { prisma } from './packages/database/index';

async function main() {
    const integration = await prisma.integration.findFirst({ where: { provider: 'SHOPIFY' } });
    if (integration) {
        console.log('SHOP_ID=' + integration.id);
    } else {
        console.log('No Shopify integration found.');
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
