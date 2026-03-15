'use server';

import { cookies } from 'next/headers';
import { prisma } from '@app-disparo/database';
import { auth } from '../../auth';

export async function getActiveStoreId(): Promise<string> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('UNAUTHORIZED: Você precisa estar logado para acessar os dados da loja.');
    }
    const userId = session.user.id;

    const cookieStore = await cookies();
    const storeIdCookie = cookieStore.get('active_store_id');

    // Se já tiver uma loja definida no cookie, vamos validar se ela pertence ao cara logado.
    if (storeIdCookie?.value) {
        const ownedStore = await prisma.store.findFirst({
            where: { id: storeIdCookie.value, ownerId: userId }
        });
        if (ownedStore) return storeIdCookie.value;
    }

    // Falha/Fallback - O cara não tem cookie ou tentou fraudar com ID de loja de outro.
    // Carrega a primeira loja DESTE USUÁRIO.
    const firstStore = await prisma.store.findFirst({
        where: { ownerId: userId },
        orderBy: { createdAt: 'asc' }
    });

    if (!firstStore) {
        throw new Error('Você não possui nenhuma loja cadastrada. Contate o Suporte.');
    }

    cookieStore.set('active_store_id', firstStore.id, {
        path: '/',
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 // 30 dias
    });

    return firstStore.id;
}

export async function getActiveStoreDetails() {
    const storeId = await getActiveStoreId();
    return prisma.store.findUnique({ where: { id: storeId } });
}

export async function getUserStores() {
    const session = await auth();
    if (!session?.user?.id) return [];
    return prisma.store.findMany({ where: { ownerId: session.user.id } });
}

export async function setActiveStore(storeId: string) {
    const cookieStore = await cookies();
    cookieStore.set('active_store_id', storeId, {
        path: '/',
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60
    });
}
