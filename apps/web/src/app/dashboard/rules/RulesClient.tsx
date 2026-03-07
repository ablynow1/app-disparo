'use client';

import { useState } from 'react';
import { createOrUpdateRule, toggleRuleActive, deleteRule } from '@/actions/rules';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { PlusCircle, Trash2, Smartphone, Bot, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function RulesClient({ initialRules, instances, agents }: { initialRules: any[], instances: any[], agents: any[] }) {
  const [rules, setRules] = useState(initialRules);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // States do formulário
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('PIX_PENDING');
  const [routingStrategy, setRoutingStrategy] = useState('ROUND_ROBIN');
  const [delayMinutes, setDelayMinutes] = useState('0');
  const [active, setActive] = useState(true);
  const [agentId, setAgentId] = useState('');
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);

  const handleOpenForm = (rule?: any) => {
    if (rule) {
      setEditingRule(rule);
      setName(rule.name);
      setEventType(rule.eventType);
      setRoutingStrategy(rule.routingStrategy);
      setDelayMinutes(String(rule.delayMinutes));
      setActive(rule.active);
      setAgentId(rule.agentId || '');
      setSelectedInstances(rule.instances.map((i: any) => i.id));
    } else {
      setEditingRule(null);
      setName('');
      setEventType('PIX_PENDING');
      setRoutingStrategy('ROUND_ROBIN');
      setDelayMinutes('0');
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
      toast.error('Marque pelo menos um WhatsApp para disparo dessa regra.');
      setLoading(false); return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('eventType', eventType);
    formData.append('routingStrategy', routingStrategy);
    formData.append('delayMinutes', delayMinutes);
    formData.append('active', String(active));
    if (agentId) formData.append('agentId', agentId);
    
    // Injeção de múltiplos arrays (N:N)
    selectedInstances.forEach(id => formData.append('instanceIds', id));

    const result = await createOrUpdateRule(formData, editingRule?.id);
    
    if (result.success) {
      toast.success(editingRule ? 'Regra Mestre atualizada!' : 'Regra de Disparo criada!');
      // Hard refresh da pagina para buscar dados novos
      window.location.reload(); 
    } else {
      toast.error(result.error || 'Erro Crítico no Banco de Dados');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza absoluta? O Roteamento de Fila irá parar na hora.')) {
      await deleteRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
      toast.error('Gatilho dizimado.', { icon: <Trash2 className="text-rose-500"/> });
    }
  };

  const handleToggle = async (id: string, currentState: boolean) => {
    await toggleRuleActive(id, !currentState);
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !currentState } : r));
    toast.success(!currentState ? 'Gatilho Armado' : 'Gatilho Congelado');
  };

  return (
    <>
      <div className="flex justify-between items-center bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/40 mb-2">
         <div>
            <h2 className="text-zinc-200 font-medium">Orquestração Ativa</h2>
            <p className="text-xs text-zinc-500">Regras e Cérebros processando Webhooks neste momento.</p>
         </div>
         <button 
           onClick={() => handleOpenForm()}
           className="bg-zinc-100 hover:bg-white text-zinc-950 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-xl shadow-zinc-100/10"
         >
           <PlusCircle size={16} /> Nova Regra
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {rules.length === 0 && (
          <div className="col-span-full border border-dashed border-zinc-800 py-20 rounded-3xl flex flex-col items-center justify-center text-zinc-500">
             Nenhuma regra engatilhada. Suas vendas de e-commerce estão paradas.
          </div>
        )}
        
        {rules.map(rule => (
          <div key={rule.id} className="bg-zinc-950/50 border border-zinc-800/60 rounded-3xl p-6 relative overflow-hidden group hover:border-zinc-700 transition-colors">
            
            <div className="flex justify-between items-start mb-4">
              <div>
                 <h3 className="font-medium text-zinc-100 text-lg mb-1">{rule.name}</h3>
                 <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-500/20">
                   {rule.eventType.replace('_', ' ')}
                 </span>
              </div>
              <Switch checked={rule.active} onCheckedChange={() => handleToggle(rule.id, rule.active)} />
            </div>

            <div className="space-y-3 mt-6">
               <div className="flex items-start gap-3 text-sm text-zinc-400">
                  <Smartphone className="w-4 h-4 mt-0.5 text-zinc-500 shrink-0" />
                  <div>
                    <span className="text-zinc-300 font-medium block">
                      {rule.instances.length} WhatsApps Vinculados
                    </span>
                    <span className="text-xs">Estratégia: {rule.routingStrategy} (Rodízio)</span>
                  </div>
               </div>

               <div className="flex items-start gap-3 text-sm text-zinc-400">
                  <Bot className={`w-4 h-4 mt-0.5 shrink-0 ${rule.agentId ? 'text-indigo-400' : 'text-zinc-600'}`} />
                  <div>
                    <span className={`font-medium block ${rule.agentId ? 'text-indigo-300' : 'text-zinc-600'}`}>
                      {rule.agentId ? `Inteligência Artificial (RAG)` : 'Mensagem Estática'}
                    </span>
                    <span className="text-xs">{rule.agent?.name || 'Cérebro Desconectado - Fallback Tradicional'}</span>
                  </div>
               </div>
            </div>

            <div className="mt-8 flex gap-2">
              <button 
                onClick={() => handleOpenForm(rule)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm py-2 rounded-xl transition-colors font-medium border border-zinc-800/50"
              >
                Editar Regra
              </button>
              <button 
                onClick={() => handleDelete(rule.id)}
                className="w-10 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-sm rounded-xl transition-colors border border-rose-500/10"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm"
               onClick={closeForm}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-950 border border-zinc-800 shadow-2xl rounded-3xl w-full max-w-2xl relative z-10 max-h-[90vh] overflow-y-auto"
            >
               <div className="sticky top-0 bg-zinc-950/80 backdrop-blur p-6 border-b border-zinc-800 flex justify-between items-center z-20">
                 <h2 className="text-xl font-semibold">{editingRule ? 'Laboratório de Regra' : 'Nova Orquestração'}</h2>
                 <button onClick={closeForm} className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 p-2 rounded-xl"><X size={18} /></button>
               </div>

               <form onSubmit={handleSave} className="p-6 space-y-6">
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase font-medium text-zinc-500 tracking-wider">Nome da Campanha</label>
                      <input 
                        required value={name} onChange={e => setName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-100" 
                        placeholder="Ex: Abandono de Carrinho Agressivo" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase font-medium text-zinc-500 tracking-wider">Gatilho do E-commerce</label>
                      <select 
                        value={eventType} onChange={e => setEventType(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-100"
                      >
                        <option value="PIX_PENDING">Boleto / Pix Gerado</option>
                        <option value="ABANDONED_CART">Carrinho Abandonado</option>
                        <option value="ORDER_PAID">Compra Aprovada</option>
                        <option value="ORDER_CANCELED">Compra Recusada</option>
                      </select>
                    </div>
                 </div>

                 <div className="bg-indigo-500/5 border border-indigo-500/20 p-5 rounded-2xl">
                    <label className="text-xs uppercase font-medium text-indigo-400 tracking-wider flex items-center gap-2 mb-4">
                       <Bot size={16} /> Cérebro IA (Inteligência Artificial RAG)
                    </label>
                    <select 
                        value={agentId} onChange={e => setAgentId(e.target.value)}
                        className="w-full bg-zinc-950 border border-indigo-500/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-200"
                      >
                        <option value="">Desligado (Usar Mensagem Robótica Padronizada)</option>
                        {agents.map(a => (
                           <option key={a.id} value={a.id}>🧠 Injetar LLM: {a.name} (GPT-4)</option>
                        ))}
                    </select>
                 </div>

                 <div className="border border-zinc-800 p-5 rounded-2xl bg-zinc-900/20">
                    <label className="text-xs uppercase font-medium text-emerald-400 tracking-wider flex items-center gap-2 mb-4">
                       <Smartphone size={16} /> Fuzis de Envio (Múltiplos N:N Disparos)
                    </label>
                    
                    {instances.length === 0 ? (
                       <p className="text-sm text-zinc-500">Nenhum WhatsApp conectado e Ativo no Banco de Dados. Vá em Conexões.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {instances.map(inst => (
                          <div 
                            key={inst.id} 
                            onClick={() => toggleInstance(inst.id)}
                            className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              selectedInstances.includes(inst.id) 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                            }`}
                          >
                            <Checkbox 
                               checked={selectedInstances.includes(inst.id)} 
                               onCheckedChange={() => toggleInstance(inst.id)}
                            />
                            <label className="text-sm font-medium cursor-pointer flex-1">
                               {inst.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>

                 <button 
                   disabled={loading}
                   type="submit" 
                   className="w-full mt-4 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                 >
                   <Save size={18} /> {loading ? 'Gravando no Banco...' : 'Salvar Regra'}
                 </button>

               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
