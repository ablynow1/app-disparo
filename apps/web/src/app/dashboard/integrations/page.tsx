import { getIntegrations } from '@/actions/integrations';
import { IntegrationClient } from './IntegrationClient';
import { AppWindow, Link2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function IntegrationsPage() {
  let integrations: any[] = [];
  let dbError: string | null = null;

  try {
    integrations = await getIntegrations();
  } catch (error: any) {
    dbError = error?.message || error?.toString() || 'Erro desconhecido';
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 flex items-center gap-3">
          <AppWindow className="text-indigo-400" /> Canais de Venda (Webhooks)
        </h1>
        <p className="text-sm text-zinc-400 max-w-2xl">
          Conecte sua loja (Shopify, Yampi, Appmax) ligando os Webhooks. Cada plataforma possui 
          um link único criptografado associado a você. Cole-o no seu Checkout e o App Disparo cuidará do resto.
        </p>
      </div>

      {dbError && (
        <div className="bg-red-950/20 border border-red-500/50 p-4 rounded-2xl text-red-400 text-sm font-mono">
          ⚠️ Falha no banco: {dbError}
        </div>
      )}

      <div className="p-6 bg-zinc-900/30 backdrop-blur border border-zinc-800/50 rounded-3xl relative overflow-hidden">
        {/* Fundo decorativo */}
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] scale-[3] pointer-events-none">
           <Link2 size={200} />
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <IntegrationClient initialIntegrations={integrations} />
        </div>
      </div>
    </div>
  );
}
