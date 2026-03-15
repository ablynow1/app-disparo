import { Activity, MessageSquareQuote, Users, Zap } from 'lucide-react';
import { prisma } from '@app-disparo/database';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Suspense } from 'react';
import { DashboardStats, DashboardStatsSkeleton } from './DashboardStats';
import { getOrdersChartData, getRecentOrdersTable } from '@/actions/metrics';
import { DisparosChart } from './DisparosChart';
import { RecentOrdersTable } from './RecentOrdersTable';

// Remove "use client" para forçar o React Server Component (SSR ultra rápido + acesso ao DB)
export const dynamic = 'force-dynamic'; // Não estático, recarrega dados reais ao visitar

export default async function DashboardPage() {

  // ---------------------------------------------------------
  // SERVER SIDE BUSCA DOS DADOS NO POSTGRESQL (ZERO LOADING)
  // ---------------------------------------------------------

  // Paraleliza as queries pesadas para ganhar ms de performance. 
  // NOTA: Os contadores globais saíram daqui e foram isolados em Cache!
  let recentLogs: any[] = [];
  let chartData: any[] = [];
  let recentOrders: any[] = [];
  let dbError: string | null = null;

  try {
    const [fetchedLogs, fetchedChartData, fetchedRecentOrders] = await Promise.all([
      prisma.conversationLog.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { contact: true },
      }),
      getOrdersChartData(),
      getRecentOrdersTable()
    ]);
    recentLogs = fetchedLogs;
    chartData = fetchedChartData;
    recentOrders = fetchedRecentOrders;
  } catch (error: any) {
    dbError = error.message || error.toString();
  }

  // Intercepta a quebra 500 do Next.js e exibe o Raio-X Diagnóstico
  if (dbError) {
    return (
      <div className="flex flex-col gap-6 mb-8 p-8 border border-red-500/50 bg-red-950/20 rounded-3xl mt-10">
        <h1 className="text-3xl font-semibold tracking-tight text-red-400">🚨 Falha Crítica de Conexão no Banco</h1>
        <p className="text-sm text-zinc-300">O servidor da AWS carregou sua página com sucesso, mas o Next.js foi impedido de puxar os dados do MongoDB Atlas e quebrou o carregamento da lista de Contatos.</p>

        <div className="bg-black/50 p-6 rounded-2xl border border-red-900/50">
          <h3 className="text-sm font-semibold text-red-300 mb-2 uppercase tracking-wide">CAUSA RAIZ (MENSAGEM SECRETA DO PRISMA):</h3>
          <pre className="text-red-200 text-xs whitespace-pre-wrap font-mono">{dbError}</pre>
        </div>

        <div className="bg-black/50 p-6 rounded-2xl border border-yellow-900/50">
          <h3 className="text-sm font-semibold text-yellow-300 mb-2 uppercase tracking-wide">VERIFICAÇÃO DE VARIÁVEIS NA AWS:</h3>
          <ul className="text-sm text-yellow-100/80 space-y-2 font-mono">
            <li>DATABASE_URL: {process.env.DATABASE_URL ? `Preenchida (${process.env.DATABASE_URL.substring(0, 20)}...)` : '⛔ VAZIA! (O .env.prod não injetou na AWS)'}</li>
            <li>NEXT_PUBLIC_API_URL: {process.env.NEXT_PUBLIC_API_URL || 'Vazia'}</li>
            <li>NODE_ENV: {process.env.NODE_ENV}</li>
          </ul>
        </div>

        <p className="text-sm text-zinc-400 mt-4 font-semibold text-white bg-red-900/30 p-4 rounded-xl">👉 Tire print exato desta tela vermelha e mande para a I.A poder te guiar para o conserto exato na sua conta MongoDB ou O.S AWS!</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Visão Geral</h1>
        <p className="text-sm text-zinc-400">Desempenho da sua conta conectado ao banco PostgreSQL ao vivo.</p>
      </div>

      {/* Grid de Métricas Premium (Otimizado por Next Cache Serverless + Suspense Fallback) */}
      <Suspense fallback={<DashboardStatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      {/* Seção 2: Área Principal de Atividades */}
      <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Painel Esquerdo Maior - CHART & TABLE */}
        <div className="xl:col-span-2 flex flex-col gap-8">

          {/* Gráfico de Barras Heatmap */}
          <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 shadow-2xl rounded-3xl p-6 min-h-[400px] flex flex-col relative overflow-hidden group hover:border-white/10 transition-all duration-500">
            {/* Top Shine Illusion */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                <Activity className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-zinc-100">Intensidade de Disparos (Últimos 7 dias)</h4>
                <p className="text-xs text-zinc-500">Volume de requisições de clientes processados pelas Instâncias WhatsApp.</p>
              </div>
            </div>

            <div className="flex-1 w-full min-h-[300px]">
              {/* Aqui renderizamos o client component Recharts */}
              <DisparosChart data={chartData} />
            </div>
          </div>

          {/* Tabela de Orders Recente */}
          <RecentOrdersTable orders={recentOrders as any} />

        </div>

        {/* Barra Lateral Direita */}
        <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 shadow-2xl rounded-3xl p-6 flex flex-col relative overflow-hidden group hover:border-white/10 transition-all duration-500">
          {/* Top Shine Illusion */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />

          <h4 className="text-sm font-medium text-zinc-200 mb-6 uppercase tracking-wider flex justify-between relative z-10">
            <span>Últimos Logs</span>
            <span className="text-zinc-500 normal-case bg-zinc-800/50 px-2 py-0.5 rounded-full">Worker Events</span>
          </h4>
          <div className="flex-1 space-y-5">
            {recentLogs.length === 0 ? (
              <p className="text-center text-sm text-zinc-500 mt-10">Nenhuma interação logada ainda.</p>
            ) : (
              recentLogs.map((log, i) => (
                <div key={log.id} className="flex gap-4 items-start relative">
                  {/* Ponto colorido (Azul INBOUND x Verde OUTBOUND) */}
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 relative z-10 shadow-sm ${log.direction === 'INBOUND' ? 'bg-blue-500 shadow-blue-500/50' : 'bg-emerald-500 shadow-emerald-500/50'
                      }`}
                  />
                  {/* Linha conectora simples (exceto no último) */}
                  {i !== recentLogs.length - 1 && <div className="absolute left-1.5 top-4 bottom-[-1.25rem] w-px bg-zinc-800" />}

                  <div className="flex-1 min-w-0 pb-1">
                    <p className="text-sm font-medium text-zinc-200">
                      {log.direction === 'INBOUND' ? 'Mensagem Recebida' : 'Bot Respondeu'}
                    </p>
                    <p className="text-xs text-zinc-500 truncate mt-0.5" title={log.text}>
                      {log.contact.pushName ? `${log.contact.pushName}: ` : ''}"{log.text}"
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-1 uppercase font-medium">
                      {formatDistanceToNow(log.createdAt, { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
