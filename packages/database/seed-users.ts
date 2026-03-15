import 'dotenv/config';
import { prisma } from './index';
import bcrypt from 'bcryptjs';

async function main() {
    console.log('🌱 Seeding administrative user...');

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Criação ou Update do Superadmin
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@appdisparo.com.br' },
        update: {
            password: hashedPassword,
            role: 'SUPERADMIN',
        },
        create: {
            name: 'Vitor (Superadmin)',
            email: 'admin@appdisparo.com.br',
            password: hashedPassword,
            role: 'SUPERADMIN',
        },
    });

    console.log(`✅ Admin user verified: ${adminUser.email}`);

    // Fetch das lojas criadas anteriormente para vincular o ownership
    const stores = await prisma.store.findMany();

    if (stores.length > 0) {
        console.log(`🔗 Linking admin to ${stores.length} existing store(s)...`);
        await prisma.store.updateMany({
            where: { ownerId: null },
            data: { ownerId: adminUser.id }
        });
        console.log('✅ Ownership updated.');
    }
}

main()
    .catch((e) => {
        console.error('FATAL ERROR:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
