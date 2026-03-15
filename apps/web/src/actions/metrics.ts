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

/**
 * Puxa os disparos/pedidos agrupados por dia para preencher o Gráfico de Barras.
 * Mostraremos até os últimos 7 ou 14 dias de movimentação.
 */
export const getOrdersChartData = unstable_cache(
  async () => {
    // Calculando a data de 7 dias atrás
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // GroupBy nativo do Prisma para alta performance no BD (GROUP BY DATE)
    const rawData = await prisma.order.groupBy({
      by: ['createdAt'], // Precisaríamos varrer o 'date', mas simplificaremos via TS após fetch
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      _count: {
        id: true, // Contar quantos pedidos naquele agrupamento
      },
    });

    // Como o Prisma GroupBy por "Mês/Dia" específico precisa de Raw Query,
    // Faremos o agrupamento rápido via TypeScript reduzindo as chaves "YYYY-MM-DD".
    const chartMap = new Map<string, number>();

    // Inicializa os últimos 7 dias com zero ("Fallback visual bonito")
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      chartMap.set(dayStr, 0);
    }

    // Preenche os dados reais onde houve movimentação
    rawData.forEach(record => {
      const dayStr = record.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      if (chartMap.has(dayStr)) {
        chartMap.set(dayStr, chartMap.get(dayStr)! + record._count.id);
      }
    });

    // Formata pro Recharts: [{ name: '28 de Out', total: 45 }]
    return Array.from(chartMap.entries()).map(([name, total]) => ({
      name,
      total,
    }));
  },
  ['metrics-chart-key'],
  {
    revalidate: 3600,
    tags: ['disparos-metrics']
  }
);

/**
 * Puxa a listagem crua e rápida dos últimos 5 Pedidos processados no SaaS,
 * para exibir na Tablela Principal "Recent Orders".
 */
export const getRecentOrdersTable = unstable_cache(
  async () => {
    const orders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        amount: true,
        status: true,
        createdAt: true,
        store: { select: { name: true } }
      }
    });

    return orders;
  },
  ['metrics-recent-table'],
  {
    revalidate: 3600,
    tags: ['disparos-metrics']
  }
);
