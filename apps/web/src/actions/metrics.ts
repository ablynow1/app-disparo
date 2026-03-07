'use server';

import { prisma } from '@app-disparo/database';
import { unstable_cache } from 'next/cache';

/**
 * [ALTA PERFORMANCE] Cache Dinâmico com `unstable_cache`
 * 
 * Em vez de forçar o PostgreSQL a fazer COUNT(*) e SUM() 
 * toda vez que alguém abre o Dashboard, nós cacheamos o resultado.
 *
 * tag: 'disparos-metrics' -> Permite limparmos esse cache cirurgicamente
 * usando `revalidateTag` quando um Webhook novo salva o pedido real. Zero Lag!
 */
export const getDashboardMetrics = unstable_cache(
  async () => {
    // 1. Contador Massivo no Banco (Pesado se rodar toda hora)
    const [totalOrders, totalInstances, totalRules] = await Promise.all([
      prisma.order.count(),
      prisma.instance.count(),
      prisma.triggerRule.count()
    ]);

    // 2. Soma de Dinheiro Retido/Processado (Exige scan da Tabela)
    const financialStats = await prisma.order.aggregate({
      _sum: {
        amount: true
      }
    });

    return {
      totalOrders,
      totalInstances,
      totalRules,
      totalRevenue: financialStats._sum.amount || 0
    };
  },
  ['metrics-cache-key'], // Chave interna do Redis/Next.js
  {
    revalidate: 3600, // No pior cenário, invalida e busca de 1h em 1h
    tags: ['disparos-metrics'] // A Chave de Ouro para revalidação On-Demand (ISR)
  }
);
