'use server';

import { prisma, Provider } from '@app-disparo/database';
import { revalidatePath } from 'next/cache';
import { getActiveStoreId } from '@/lib/store';

/**
 * Busca todas as integrações cadastradas. 
 * Na falta, cria mocks para as 3 principais a nível de Setup MVP.
 */
export async function getIntegrations() {
  const storeId = await getActiveStoreId();
  let integrations = await prisma.integration.findMany({
    where: { storeId },
    orderBy: { provider: 'asc' }
  });

  // Seeds (Caso seja o primeiro uso)
  if (integrations.length === 0) {
    await prisma.integration.createMany({
      data: [
        { provider: 'APPMAX', active: false, storeId },
        { provider: 'SHOPIFY', active: false, storeId },
        { provider: 'YAMPI', active: false, storeId },
      ]
    });
    integrations = await prisma.integration.findMany({ where: { storeId } });
  }

  return integrations;
}

/**
 * Alterna o status Ligado/Desligado do Webhook.
 */
export async function toggleIntegration(id: string, active: boolean) {
  try {
    const storeId = await getActiveStoreId();
    await prisma.integration.updateMany({
      where: { id, storeId },
      data: { active }
    });
    revalidatePath('/dashboard/integrations');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Salva as credenciais/tokens de uma integração (ex: token da Yampi, chave HMAC da Shopify)
 */
export async function saveIntegrationCredentials(id: string, credentials: any) {
  try {
    const storeId = await getActiveStoreId();
    await prisma.integration.updateMany({
      where: { id, storeId },
      data: { credentials }
    });
    revalidatePath('/dashboard/integrations');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
