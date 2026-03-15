'use client';

import { useState } from 'react';
import { createOrUpdateRule, toggleRuleActive, deleteRule } from '@/actions/rules';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { PlusCircle, Trash2, Smartphone, Bot, Save, X, ArrowRight, Zap, ShoppingCart, Banknote, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const triggerIcons: Record<string, any> = {
  PIX_PENDING: <Banknote className="text-amber-500" />,
  ABANDONED_CART: <ShoppingCart className="text-blue-500" />,
  ORDER_PAID: <Zap className="text-emerald-500" />,
  ORDER_CANCELED: <XCircle className="text-rose-500" />,
};

const triggerLabels: Record<string, string> = {
  PIX_PENDING: 'Boleto / Pix Gerado',
  ABANDONED_CART: 'Carrinho Abandonado',
  ORDER_PAID: 'Compra Aprovada',
  ORDER_CANCELED: 'Compra Recusada',
};

export function RulesClient({ initialRules, instances, agents }: { initialRules: any[], instances: any[], agents: any[] }) {
  const [rules, setRules] = useState(initialRules);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // States do formulário Visual Step-by-Step
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('PIX_PENDING');
  const [active, setActive] = useState(true);
  const [agentId, setAgentId] = useState('');
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);

  const handleOpenForm = (rule?: any) => {
    if (rule) {
      setEditingRule(rule);
      setName(rule.name);
      setEventType(rule.eventType);
      setActive(rule.active);
      setAgentId(rule.agentId || '');
      setSelectedInstances(rule.instances.map((i: any) => i.id));
    } else {
      setEditingRule(null);
      setName('');
      setEventType('PIX_PENDING');
      setActive(true);
      setAgentId('');
      setSelectedInstances([]);
    }
    setIsFormOpen(true);
  };

  const closeForm = () => setIsFormOpen(false);

  const toggleInstance = (id: string) => {
    setSelectedInstances(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (selectedInstances.length === 0) {
      toast.error('O Fluxo não tem saída. Marque pelo menos 1 WhatsApp disparador.');
      setLoading(false); return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('eventType', eventType);
    formData.append('routingStrategy', 'ROUND_ROBIN');
    formData.append('delayMinutes', '0');
    formData.append('active', String(active));
    if (agentId) formData.append('agentId', agentId);

    selectedInstances.forEach(id => formData.append('instanceIds', id));

    const result = await createOrUpdateRule(formData, editingRule?.id);

    if (result.success) {
      toast.success(editingRule ? 'Estrutura Visual Reforjada!' : 'Novo Fluxograma Ativado!');
      window.location.reload();
    } else {
      toast.error(result.error || 'Erro Crítico no Banco de Dados');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deletar esse fluxograma interromperá todas as vendas atreladas a ele. Confirmar?')) {
      await deleteRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
      toast.error('Fluxograma Destruído.');
    }
  };

  const handleToggle = async (id: string, currentState: boolean) => {
    await toggleRuleActive(id, !currentState);
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !currentState } : r));
    toast.success(!currentState ? 'Tráfego Liberado no Fluxo' : 'Tráfego Bloqueado');
  };

  return (
    <>
      <div className="flex justify-between items-center bg-white/[0.02] backdrop-blur-3xl p-5 rounded-3xl border border-white/5 mb-6 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-500">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
        <div className="relative z-10">
          <h2 className="text-zinc-100 font-semibold text-xl">Pipelines de Disparo Ativos</h2>
          <p className="text-sm text-zinc-500 mt-1">Conexões programadas entre Módulos E-commerce, Inteligência Artificial e WhatsApp.</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 relative z-10"
        >
          <PlusCircle size={18} /> Novo Workflow
        </button>
      </div>

      <div className="space-y-6">
        {rules.length === 0 && (
          <div className="border border-dashed border-zinc-800 py-32 rounded-3xl flex flex-col items-center justify-center text-zinc-500">
            Nenhum workflow de automação montado. Desenhe seu primeiro fluxo.
          </div>
        )}

        {rules.map(rule => (
          <div key={rule.id} className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-all shadow-2xl">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-zinc-800/50 pb-4">
              <div>
                <h3 className="font-semibold text-zinc-100 text-lg flex items-center gap-2">{rule.name}</h3>
                <span className="text-xs text-zinc-500 font-mono mt-1 block">ID do Fluxo: {rule.id.split('').slice(0, 8).join('')}</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleOpenForm(rule)}
                  className="text-zinc-400 hover:text-zinc-100 text-sm font-medium transition-colors bg-zinc-900 hover:bg-zinc-800 px-4 py-2 rounded-xl border border-zinc-800"
                >
                  ⚙️ Editar Fluxo
                </button>
                <Switch checked={rule.active} onCheckedChange={() => handleToggle(rule.id, rule.active)} />
                <button onClick={() => handleDelete(rule.id)} className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-xl transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>

            {/* Visual Pipeline Grid Mode */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2 px-4 py-4 md:py-8 overflow-x-auto">

              {/* NÓ 1: GATILHO */}
              <div className="flex flex-col items-center w-48 shrink-0 relative">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-inner mb-3 z-10">
                  {triggerIcons[rule.eventType] || <Zap className="text-zinc-400" />}
                </div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Trigger Event</span>
                <span className="text-sm text-zinc-200 text-center font-medium bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                  {triggerLabels[rule.eventType] || rule.eventType}
                </span>
              </div>

              {/* Conector */}
              <div className="hidden md:flex items-center text-zinc-700 hidden-arrow">
                <ArrowRight size={32} className={rule.active ? "text-indigo-500/30" : "text-zinc-800"} strokeWidth={1} />
              </div>

              {/* NÓ 2: CÉREBRO (IA) */}
              <div className="flex flex-col items-center w-48 shrink-0 relative">
                <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-inner mb-3 z-10 ${rule.agentId ? 'bg-indigo-900/20 border-indigo-500/40 text-indigo-400' : 'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
                  <Bot size={28} />
                </div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Processador Lógico</span>
                <span className="text-sm text-zinc-200 text-center font-medium bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800 truncate max-w-full">
                  {rule.agent?.name || 'Padrão (Sem IA)'}
                </span>
              </div>

              {/* Conector */}
              <div className="hidden md:flex items-center text-zinc-700 hidden-arrow">
                <ArrowRight size={32} className={rule.active ? "text-emerald-500/30" : "text-zinc-800"} strokeWidth={1} />
              </div>

              {/* NÓ 3: CANHÕES (INSTÂNCIAS) */}
              <div className="flex flex-col items-center w-48 shrink-0 relative">
                <div className="flex -space-x-3 mb-3 z-10">
                  {rule.instances.slice(0, 3).map((inst: any, i: number) => (
                    <div key={i} className="w-16 h-16 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-md backdrop-blur-sm relative" style={{ zIndex: 10 - i }}>
                      <Smartphone size={24} />
                    </div>
                  ))}
                  {rule.instances.length > 3 && (
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center shadow-md text-xs font-bold z-0">
                      +{rule.instances.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Delivery Output</span>
                <span className="text-sm text-emerald-100 text-center font-medium bg-emerald-900/20 px-3 py-1 rounded-full border border-emerald-500/20 truncate max-w-full">
                  Roteamento em {rule.instances.length} Chips
                </span>
              </div>

            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={closeForm}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0c0c0e] border border-zinc-800 shadow-2xl rounded-[2rem] w-full max-w-5xl relative z-10 h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="shrink-0 bg-zinc-900/50 p-6 border-b border-zinc-800/80 flex justify-between items-center z-20">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Zap className="text-amber-400" /> {editingRule ? 'Reprogramar Workflow' : 'Montar Automação Visual'}
                  </h2>
                  <p className="text-sm text-zinc-400 mt-1">Ligue os nós para criar um pipeline de vendas inquebrável.</p>
                </div>
                <button onClick={closeForm} className="text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 hover:bg-zinc-800 p-3 rounded-2xl"><X size={20} /></button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 bg-dot-pattern">

                {/* NÓ GERAL */}
                <div className="mb-10 bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800 flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs uppercase font-bold text-indigo-400 tracking-widest ml-1">Label Interna da Pipeline</label>
                    <input
                      required value={name} onChange={e => setName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-6 py-4 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white placeholder:text-zinc-700 transition-all"
                      placeholder="Ex: Recuperação de Pix Atrasado"
                    />
                  </div>
                </div>

                {/* VISUAL BUILDER ARENA */}
                <div className="relative flex flex-col md:flex-row gap-6 md:gap-0 bg-white/[0.01] backdrop-blur-xl rounded-3xl border border-white/5 p-6 md:p-10 mb-8 overflow-hidden items-center justify-between min-h-[400px] shadow-2xl">

                  {/* Linha de Conexão no Fundo */}
                  <div className="hidden md:block absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-[80%] h-1 bg-gradient-to-r from-zinc-800 via-indigo-900/50 to-emerald-900/50 z-0 rounded-full"></div>

                  {/* Bloco 1: Trigger */}
                  <div className="z-10 bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full md:w-[30%] shadow-2xl relative group">
                    <div className="absolute -inset-[1px] bg-gradient-to-b from-amber-500/20 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity z-[-1] blur-md"></div>
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                      <Banknote size={24} />
                    </div>
                    <h3 className="text-white font-semibold mb-1">Gatilho de Origem</h3>
                    <p className="text-xs text-zinc-500 mb-5">Quando o E-commerce disparar...</p>

                    <select
                      value={eventType} onChange={e => setEventType(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-200 cursor-pointer"
                    >
                      <option value="PIX_PENDING">O Lead Gerar Pix (PIX_PENDING)</option>
                      <option value="ABANDONED_CART">O Lead Abadonar Checkout (ABANDONED_CART)</option>
                      <option value="ORDER_PAID">O Pedido for Pago (ORDER_PAID)</option>
                      <option value="ORDER_CANCELED">O Cartão for Recusado (ORDER_CANCELED)</option>
                    </select>
                  </div>

                  {/* Bloco 2: Cérebro IA */}
                  <div className="z-10 bg-zinc-950 border border-indigo-900/30 rounded-3xl p-6 w-full md:w-[30%] shadow-2xl relative group transform md:-translate-y-4">
                    <div className="absolute -inset-[1px] bg-gradient-to-b from-indigo-500/30 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity z-[-1] blur-md"></div>
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                      <Bot size={24} />
                    </div>
                    <h3 className="text-white font-semibold mb-1">Processador LLM</h3>
                    <p className="text-xs text-zinc-500 mb-5">Traduzir intent enviando RAG para...</p>

                    <select
                      value={agentId} onChange={e => setAgentId(e.target.value)}
                      className="w-full bg-zinc-900 border border-indigo-900/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-300 cursor-pointer"
                    >
                      <option value="" className="text-zinc-500">Fluxo Burrro (Copiar Variáveis Puras)</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>🧠 {a.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Bloco 3: Disparadores */}
                  <div className="z-10 bg-zinc-950 border border-emerald-900/30 rounded-3xl w-full md:w-[30%] shadow-2xl relative group flex flex-col h-full max-h-[300px]">
                    <div className="absolute -inset-[1px] bg-gradient-to-b from-emerald-500/30 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity z-[-1] blur-md"></div>
                    <div className="p-6 pb-2 shrink-0">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                        <Smartphone size={24} />
                      </div>
                      <h3 className="text-white font-semibold mb-1">Rotas de Disparo</h3>
                      <p className="text-xs text-zinc-500">Descarregar na ponta por meio de...</p>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 pb-6 mt-4 space-y-2 custom-scrollbar">
                      {instances.length === 0 ? (
                        <p className="text-xs text-rose-500 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">Zero aparelhos pareados. Vá em Conexões Web.</p>
                      ) : (
                        instances.map(inst => (
                          <div
                            key={inst.id} onClick={() => toggleInstance(inst.id)}
                            className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedInstances.includes(inst.id)
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                              }`}
                          >
                            <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center transition-colors ${selectedInstances.includes(inst.id) ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-zinc-600'}`}>
                              {selectedInstances.includes(inst.id) && <span className="text-black text-[10px] pb-[1px]">✓</span>}
                            </div>
                            <label className="text-sm font-medium cursor-pointer flex-1 truncate">{inst.name}</label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

                {/* Area de Submissão Bottom */}
                <div className="sticky bottom-0 mt-8">
                  <button
                    disabled={loading} type="submit"
                    className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-lg py-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] disabled:opacity-50"
                  >
                    <Save size={20} /> {loading ? 'Compilando Core...' : 'Armar Gatilho no Motor de Venda'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
