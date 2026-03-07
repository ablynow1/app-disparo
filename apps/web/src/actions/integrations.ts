'use server';

import { prisma, Provider } from '@app-disparo/database';
import { revalidatePath } from 'next/cache';

/**
 * Busca todas as integrações cadastradas. 
 * Na falta, cria mocks para as 3 principais a nível de Setup MVP.
 */
export async function getIntegrations() {
  let integrations = await prisma.integration.findMany({
    orderBy: { provider: 'asc' }
  });

  // Seeds (Caso seja o primeiro uso)
  if (integrations.length === 0) {
    await prisma.integration.createMany({
      data: [
        { provider: 'APPMAX', active: false },
        { provider: 'SHOPIFY', active: false },
        { provider: 'YAMPI', active: false },
      ]
    });
    integrations = await prisma.integration.findMany();
  }

  return integrations;
}

/**
 * Alterna o status Ligado/Desligado do Webhook.
 */
export async function toggleIntegration(id: string, active: boolean) {
  try {
    await prisma.integration.update({
      where: { id },
      data: { active }
    });
    revalidatePath('/dashboard/integrations');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
