'use client';

import { useState, useEffect, useCallback } from 'react';
import { Smartphone, Plus, Trash2, RefreshCw, CheckCircle2, AlertCircle, QrCode, X, Loader2, Zap } from 'lucide-react';
import { createInstance, deleteInstance, getQrCode, syncInstanceStatus, fetchEvoInstances, updateInstanceAgent } from '@/actions/instances';

interface Instance {
  instanceName: string;
  status: string;
  owner?: string;
  profileName?: string;
  profilePictureUrl?: string;
  agentId?: string | null;
  agentName?: string | null;
}

export function InstancesClient({ initialInstances, availableAgents = [] }: { initialInstances: Instance[], availableAgents?: any[] }) {
  const [instances, setInstances] = useState<Instance[]>(initialInstances);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrModal, setQrModal] = useState<{ open: boolean; instance: string; qr: string | null; polling: boolean; debugInfo?: string }>({
    open: false, instance: '', qr: null, polling: false
  });
  const [error, setError] = useState<string | null>(null);

  // Refresh de instâncias do servidor
  const refreshInstances = useCallback(async () => {
    const { instances: fresh } = await fetchEvoInstances();
    setInstances(fresh);
  }, []);

  // Polling do QR Code até conectar
  useEffect(() => {
    if (!qrModal.open || !qrModal.polling) return;
    const interval = setInterval(async () => {
      const result = await getQrCode(qrModal.instance);
      if (result.status === 'open') {
        // Conectou! Sincroniza banco e fecha modal
        await syncInstanceStatus(qrModal.instance, 'open');
        setQrModal(q => ({ ...q, open: false, polling: false, qr: null }));
        await refreshInstances();
        clearInterval(interval);
      } else if (result.qrCode) {
        setQrModal(q => ({ ...q, qr: result.qrCode }));
      } else {
        // QR não chegou - mostra debug
        setQrModal(q => ({ ...q, debugInfo: JSON.stringify(result.raw || 'sem resposta').slice(0, 200) }));
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [qrModal.open, qrModal.polling, qrModal.instance, refreshInstances]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setLoading(true);
    setError(null);
    const result = await createInstance(newName);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Erro desconhecido');
      return;
    }
    setShowModal(false);
    setNewName('');
    // Abre o modal do QR Code automaticamente
    if (result.instanceName) {
      setQrModal({ open: true, instance: result.instanceName, qr: result.qrCode || null, polling: true });
    }
    await refreshInstances();
  }

  async function handleShowQr(instanceName: string) {
    setQrModal({ open: true, instance: instanceName, qr: null, polling: true });
    const { qrCode } = await getQrCode(instanceName);
    setQrModal(q => ({ ...q, qr: qrCode }));
  }

  async function handleDelete(instanceName: string) {
    if (!confirm(`Remover a instância "${instanceName}"? Esta ação é irreversível.`)) return;
    await deleteInstance(instanceName);
    await refreshInstances();
  }

  async function handleAgentChange(instanceName: string, agentId: string) {
    const val = agentId === 'none' ? null : agentId;
    await updateInstanceAgent(instanceName, val);
    await refreshInstances();
  }

  return (
    <>
      {/* Header com botão de adicionar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Aparelhos / WhatsApp</h1>
          <p className="text-sm text-zinc-400 mt-1">Suas conexões de WhatsApp usadas para disparos e automações.</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError(null); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20 text-sm"
        >
          <Plus className="w-4 h-4" /> Adicionar Telefone
        </button>
      </div>

      {/* Grid de instâncias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {instances.length > 0 ? (
          instances.map((inst, index) => (
            <div key={index} className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 hover:border-white/10 transition-all duration-500 hover:-translate-y-1 p-6 rounded-3xl shadow-2xl relative overflow-hidden group flex flex-col">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all">
                <Smartphone size={80} />
              </div>

              <div className="flex items-center gap-4 mb-6">
                {inst.profilePictureUrl ? (
                  <img src={inst.profilePictureUrl} alt="Foto de perfil"
                    className="w-16 h-16 rounded-full border-2 border-zinc-800 shadow-md object-cover relative z-10" />
                ) : (
                  <div className="w-16 h-16 bg-zinc-800 rounded-full border-2 border-zinc-700 flex items-center justify-center relative z-10">
                    <Smartphone className="text-zinc-500 w-6 h-6" />
                  </div>
                )}
                <div className="relative z-10">
                  <h3 className="text-lg font-semibold text-zinc-100 tracking-tight leading-none mb-1">
                    {inst.profileName || inst.instanceName}
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium select-all">
                    {inst.owner ? inst.owner.split('@')[0] : inst.instanceName}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mt-auto relative z-10">
                <div className="flex items-center justify-between text-sm bg-zinc-950/50 px-3 py-2 rounded-xl">
                  <span className="text-zinc-500 font-medium">Status</span>
                  {inst.status === 'open' ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs bg-emerald-500/10 px-2 py-1 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ONLINE
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs bg-amber-500/10 px-2 py-1 rounded-md">
                      <AlertCircle className="w-3.5 h-3.5" /> AGUARDANDO QR
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm bg-zinc-950/50 px-3 py-2 rounded-xl mt-2">
                  <span className="text-zinc-500 font-medium">Cérebro IA</span>
                  <select
                    value={inst.agentId || 'none'}
                    onChange={(e) => handleAgentChange(inst.instanceName, e.target.value)}
                    className="bg-zinc-900 border border-zinc-700/50 text-zinc-300 text-xs rounded-lg px-2 py-1 max-w-[140px] truncate focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="none">Desativado</option>
                    {availableAgents.map((agent: any) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-zinc-800/50 flex gap-2 relative z-10">
                {inst.status === 'open' ? (
                  <button disabled className="flex-1 bg-zinc-800/50 text-zinc-500 text-sm font-medium py-2.5 rounded-xl cursor-not-allowed">
                    Dispositivo Conectado
                  </button>
                ) : (
                  <button
                    onClick={() => handleShowQr(inst.instanceName)}
                    className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-medium py-2.5 rounded-xl transition-colors border border-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4" /> Ler QRCode
                  </button>
                )}
                <button
                  onClick={() => handleDelete(inst.instanceName)}
                  className="w-12 flex items-center justify-center bg-zinc-800/50 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-zinc-900/20 backdrop-blur border border-zinc-800/40 border-dashed rounded-3xl p-10 flex flex-col justify-center items-center text-center">
            <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-zinc-700/50 text-zinc-500">
              <Smartphone className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-medium text-zinc-200 mb-2">Nenhum Telefone Cadastrado</h4>
            <p className="text-zinc-500 mb-8 max-w-sm">Para o robô funcionar você precisa emparelhar sua conta do WhatsApp.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-white text-black hover:bg-zinc-200 px-6 py-3 rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2"
            >
              <Zap className="w-4 h-4" /> Adicionar Telefone
            </button>
          </div>
        )}
      </div>

      {/* Modal: Criar Nova Instância */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-background/80 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h2 className="text-xl font-semibold text-zinc-100">Novo Telefone</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-zinc-400 mb-6">
              Dê um nome para identificar esse telefone (ex: "principal", "vendas", "suporte"). Depois você vai escanear o QR Code.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 font-medium mb-2">Nome da Instância</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="ex: principal, vendas, suporte..."
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 px-4 py-3 rounded-xl text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-rose-400 bg-rose-500/10 px-3 py-2 rounded-xl">{error}</p>
              )}

              <button
                onClick={handleCreate}
                disabled={loading || !newName.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {loading ? 'Criando...' : 'Criar e Gerar QR Code'}
              </button>
            </div>
          </div>
        </div>
      )}

  // Modal: QR Code
      {qrModal.open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-background/80 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h2 className="text-xl font-semibold text-zinc-100">Escanear QR Code</h2>
              <button
                onClick={() => setQrModal(q => ({ ...q, open: false, polling: false }))}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-zinc-400 mb-6">
              Abra o WhatsApp → <strong className="text-zinc-300">Aparelhos conectados</strong> → <strong className="text-zinc-300">Conectar aparelho</strong> e escaneie o código abaixo.
            </p>

            <div className="bg-white p-4 rounded-2xl inline-block mb-4">
              {qrModal.qr ? (
                <img src={qrModal.qr} alt="QR Code WhatsApp" className="w-52 h-52 object-contain" />
              ) : (
                <div className="w-52 h-52 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
                  <span className="text-xs text-zinc-400 px-2">Aguardando QR Code da Evolution API...</span>
                </div>
              )}
            </div>

            {qrModal.debugInfo && !qrModal.qr && (
              <div className="mt-3 bg-zinc-800 rounded-xl p-3 text-left">
                <p className="text-xs text-amber-400 font-mono mb-1">⚠️ Resposta da Evolution API:</p>
                <p className="text-xs text-zinc-400 font-mono break-all">{qrModal.debugInfo}</p>
              </div>
            )}

            <p className="text-xs text-zinc-500 flex items-center justify-center gap-1.5 mt-4">
              <RefreshCw className="w-3 h-3 animate-spin" /> Atualizando automaticamente...
            </p>
          </div>
        </div>
      )}
    </>
  );
}
