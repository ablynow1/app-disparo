'use client';

import { useState } from 'react';
import { toggleIntegration } from '@/actions/integrations';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Copy, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Integration = {
  id: string;
  provider: string; // 'APPMAX' | 'SHOPIFY' | 'YAMPI'
  active: boolean;
};

export function IntegrationClient({ initialIntegrations }: { initialIntegrations: Integration[] }) {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggle = async (id: string, activeStatus: boolean) => {
    setLoadingId(id);
    const result = await toggleIntegration(id, !activeStatus);

    if (result.success) {
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, active: !activeStatus } : i));
      toast.success(!activeStatus ? 'Webhook Ativado!' : 'Integração Pausada');
    } else {
      toast.error('Falha ao alterar integração.');
    }
    setLoadingId(null);
  };

  const copyToClipboard = (integration: Integration) => {
    // URL Real puxada da API
    const webhookUrl = `https://api.app-disparo.com.br/api/webhooks/${integration.provider.toLowerCase()}/${integration.id}`;
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook copiado para a Área de Transferência', {
      icon: <CheckCircle2 className="text-emerald-500" />
    });
  };

  const getBranding = (provider: string) => {
    switch (provider) {
      case 'SHOPIFY': return { color: 'bg-[#95BF47]/10 text-[#95BF47] border-[#95BF47]/30', logo: 'S' };
      case 'YAMPI': return { color: 'bg-purple-500/10 text-purple-400 border-purple-500/30', logo: 'Y' };
      case 'APPMAX': return { color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', logo: 'A' };
      default: return { color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30', logo: 'W' };
    }
  };

  return (
    <>
      {integrations.map((integration) => {
        const brand = getBranding(integration.provider);
        return (
          <div key={integration.id} className="bg-zinc-950/50 border border-zinc-800/60 rounded-2xl flex flex-col overflow-hidden transition-all duration-300 hover:border-zinc-700">
            {/* Header do Card */}
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${brand.color}`}>
                  {brand.logo}
                </div>
                <div>
                  <h3 className="text-zinc-100 font-medium capitalize">{integration.provider.toLowerCase()}</h3>
                  <p className="text-xs text-zinc-500">{integration.active ? 'Recebendo Leads' : 'Conexão Inativa'}</p>
                </div>
              </div>
              <Switch
                checked={integration.active}
                onCheckedChange={() => handleToggle(integration.id, integration.active)}
                disabled={loadingId === integration.id}
                className="data-[state=checked]:bg-indigo-500"
              />
            </div>

            {/* Expansão Animada Sensacional c/ Framer Motion */}
            <AnimatePresence>
              {integration.active && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-zinc-900/60 border-t border-zinc-800/60 px-5 overflow-hidden"
                >
                  <div className="py-4 flex flex-col gap-4">
                    {/* WEBHOOK URL */}
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">URL do Webhook</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-black/40 text-xs text-indigo-300 px-3 py-2.5 rounded-lg border border-zinc-800 truncate">
                          https://api.app-disparo.com.br/api/webhooks/{integration.provider.toLowerCase()}/{integration.id}
                        </code>
                        <button
                          onClick={() => copyToClipboard(integration)}
                          className="bg-indigo-500 hover:bg-indigo-400 text-white p-2.5 rounded-lg transition-colors flex items-center justify-center shrink-0"
                          title="Copiar Payload"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1">Cole este link nas configurações de Webhook dentro da {integration.provider}. Use os eventos de Criação/Atualização de Pedido.</p>
                    </div>

                    {/* CREDENTIALS */}
                    <div className="flex flex-col gap-2 bg-black/20 p-3 rounded-xl border border-white/5">
                      <p className="text-xs text-zinc-400 font-medium tracking-wider">
                        Configuração de Segurança
                      </p>

                      {integration.provider === 'SHOPIFY' && (
                        <p className="text-xs text-zinc-500 mb-1">
                          A Shopify utiliza um HMAC Secret para assinar os webhooks. Você pode encontrá-lo no painel da Shopify logo abaixo da lista de webhooks.
                        </p>
                      )}

                      {integration.provider === 'YAMPI' && (
                        <p className="text-xs text-zinc-500 mb-1">
                          A Yampi exige um Token/Alias para que o sistema possa aceitar a requisição com segurança.
                        </p>
                      )}

                      {integration.provider === 'APPMAX' && (
                        <p className="text-xs text-zinc-500 mb-1">
                          O Token da Appmax deve ser colado aqui para garantir a verificação de assinatura e segurança dos pedidos recebidos.
                        </p>
                      )}

                      <div className="flex items-center gap-3 w-full">
                        <input
                          type="text"
                          placeholder={`Secret / Token (${integration.provider})`}
                          className="flex-1 h-9 bg-zinc-950 border border-zinc-800 rounded-lg text-sm px-3 text-zinc-200 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
                          defaultValue={(integration as any).credentials?.token || ''}
                          onChange={async (e) => {
                            const { saveIntegrationCredentials } = await import('@/actions/integrations');
                            await saveIntegrationCredentials(integration.id, { token: e.target.value });
                          }}
                        />
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </>
  );
}
