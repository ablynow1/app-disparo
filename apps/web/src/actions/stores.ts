'use server';

import { getActiveStoreId, setActiveStore, getUserStores } from '@/lib/store';

export async function getStoresForSelector() {
    // 🔒 Puxamos APENAS as Lojas do Usuário Logado! O ID vem do JWT.
    const stores = await getUserStores();

    let activeId;
    try {
        activeId = await getActiveStoreId();
    } catch (e) {
        // Se der erro de Unauthorized (deslogado ou sem lojass) na lib, apenas retornamos vazio.
        return { stores: [], activeId: '' };
    }

    return { stores, activeId };
}

export async function switchActiveStore(storeId: string) {
    await setActiveStore(storeId);
    return { success: true };
}
