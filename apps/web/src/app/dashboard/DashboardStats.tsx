import { Activity, LayoutDashboard, Link2, Zap } from 'lucide-react';
import { getDashboardMetrics } from '@/actions/metrics';

export async function DashboardStats() {
  let metrics;
  try {
    metrics = await getDashboardMetrics();
  } catch (error: any) {
    return (
      <div className="col-span-full bg-red-950/20 border border-red-500/50 p-6 rounded-3xl text-red-400 text-sm">
        Falha no Banco ao puxar métricas: <span className="font-mono text-xs">{error.message || error.toString()}</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total de Pedidos */}
      <div className="bg-zinc-900/40 hover:bg-zinc-900/60 backdrop-blur-2xl border border-white/5 hover:border-white/10 transition-all duration-500 p-6 rounded-3xl shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all">
          <LayoutDashboard size={64} />
        </div>
        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-4">
          <LayoutDashboard className="text-indigo-400 w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-zinc-400">Total de Pedidos Retidos</p>
        <h3 className="text-4xl font-semibold text-zinc-50 tracking-tight mt-1">{metrics.totalOrders}</h3>
        <div className="flex items-center gap-2 mt-4 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 w-max px-2 py-1 rounded-full uppercase tracking-wider">
          <Activity className="w-3 h-3" /> Otimizado com Next Cache
        </div>
      </div>

      {/* Renda Descoberta */}
      <div className="bg-zinc-900/40 hover:bg-zinc-900/60 backdrop-blur-2xl border border-white/5 hover:border-white/10 transition-all duration-500 p-6 rounded-3xl shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all">
          <Zap size={64} />
        </div>
        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
          <Zap className="text-emerald-400 w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-zinc-400">Receita Mapeada (R$)</p>
        <h3 className="text-4xl font-semibold text-zinc-50 tracking-tight mt-1">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(metrics.totalRevenue)}
        </h3>
        <div className="flex items-center gap-2 mt-4 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 w-max px-2 py-1 rounded-full uppercase tracking-wider">
          <Activity className="w-3 h-3" /> Otimizado com Next Cache
        </div>
      </div>

      {/* Numeros Conectados */}
      <div className="bg-zinc-900/40 hover:bg-zinc-900/60 backdrop-blur-2xl border border-white/5 hover:border-white/10 transition-all duration-500 p-6 rounded-3xl shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all">
          <Link2 size={64} />
        </div>
        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
          <Link2 className="text-amber-400 w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-zinc-400">Instâncias Whatsapp</p>
        <h3 className="text-4xl font-semibold text-zinc-50 tracking-tight mt-1">{metrics.totalInstances}</h3>
        <div className="flex items-center gap-2 mt-4 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 w-max px-2 py-1 rounded-full uppercase tracking-wider">
          <Activity className="w-3 h-3" /> Otimizado com Next Cache
        </div>
      </div>

      {/* Regras Ativas */}
      <div className="bg-zinc-900/40 hover:bg-zinc-900/60 backdrop-blur-2xl border border-white/5 hover:border-white/10 transition-all duration-500 p-6 rounded-3xl shadow-2xl relative overflow-hidden group">
        <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center mb-4">
          <Activity className="text-rose-400 w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-zinc-400">Regras de Automação</p>
        <h3 className="text-4xl font-semibold text-zinc-50 tracking-tight mt-1">{metrics.totalRules}</h3>
        <div className="flex items-center gap-2 mt-4 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 w-max px-2 py-1 rounded-full uppercase tracking-wider">
          <Activity className="w-3 h-3" /> Otimizado com Next Cache
        </div>
      </div>
    </div>
  );
}

// UI Ghost (Loading) premium pulsante
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white/[0.02] backdrop-blur-2xl border border-white/5 p-6 rounded-3xl h-[178px] flex flex-col justify-end animate-pulse shadow-2xl">
          <div className="w-10 h-10 bg-zinc-800/60 rounded-xl mb-auto" />
          <div className="h-4 w-32 bg-zinc-800/60 rounded-full mt-4" />
          <div className="h-10 w-20 bg-zinc-700/60 rounded-lg mt-2" />
        </div>
      ))}
    </div>
  );
}
