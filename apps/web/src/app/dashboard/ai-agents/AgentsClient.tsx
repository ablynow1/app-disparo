'use client';

import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { saveAiAgent, deleteAiAgent, toggleAiAgentAuth } from '@/actions/ai-agents';

import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Trash2, PlusCircle, Save, X, Network, FileText, Zap } from 'lucide-react';

// O mesmo Zod Schema do Backend, recriado p/ validação Client-Side de Front!
const agentSchema = z.object({
  name: z.string().min(3, "Nome muito curto"),
  provider: z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE_VERTEX']),
  isActive: z.boolean(),
  temperature: z.number().min(0).max(1),
  systemPrompt: z.string().min(10, "Instrução muito curta"),
  knowledgeBases: z.array(z.object({
    title: z.string().min(1, 'Sem título'),
    content: z.string().min(5, 'Texto da regra muito escasso.'),
  }))
});

type FormValues = z.infer<typeof agentSchema>;

export function AgentsClient({ initialAgents }: { initialAgents: any[] }) {
  const [agents, setAgents] = useState(initialAgents);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: '', provider: 'OPENAI', isActive: true, 
      temperature: 0.5, systemPrompt: '', knowledgeBases: []
    }
  });

  // O Milagre do Array Múltiplo para a área RAG da IA
  const { fields, append, remove } = useFieldArray({
    control, name: "knowledgeBases"
  });

  const openForm = (agent?: any) => {
    if (agent) {
      setEditingId(agent.id);
      reset({
         name: agent.name, provider: agent.provider,
         isActive: agent.isActive, temperature: agent.temperature,
         systemPrompt: agent.systemPrompt,
         knowledgeBases: agent.knowledgeBases.map((kb: any) => ({ title: kb.title, content: kb.content }))
      });
    } else {
      setEditingId(null);
      reset({ 
         name: '', provider: 'OPENAI', isActive: true, 
         temperature: 0.7, systemPrompt: 'Você é um assistente virtual gentil e prestativo.', knowledgeBases: [] 
      });
    }
    setIsFormOpen(true);
  };

  const closeForm = () => { setIsFormOpen(false); reset(); };

  const onSubmit = async (data: FormValues) => {
    const res = await saveAiAgent(data, editingId || undefined);
    if (res.success) {
       toast.success(editingId ? 'Cérebro Ajustado!' : 'Agente IA Engatilhado!');
       window.location.reload(); 
    } else {
       toast.error(res.error || 'Falha ao plugar o LLM no banco de dados.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Atenção: Destruir esse cérebro apagará também todas as suas bases RAG. Continuar?')) {
       const res = await deleteAiAgent(id);
       if (res.success) {
         setAgents(prev => prev.filter(a => a.id !== id));
         toast.success('Agente dizimado.');
       }
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await toggleAiAgentAuth(id, !active);
    setAgents(prev => prev.map(a => a.id === id ? { ...a, isActive: !active }: a));
    toast.success('Chave Energética alterada');
  };

  return (
    <>
      <div className="flex justify-between items-center bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/40 mb-2">
         <div>
            <h2 className="text-zinc-200 font-medium">Seus Modelos LLM</h2>
            <p className="text-xs text-zinc-500">A quantidade de Agentes Ativos é escalável (GPT-4o / Outros).</p>
         </div>
         <button 
           onClick={() => openForm()}
           className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
         >
           <PlusCircle size={16} /> Novo Agente IA
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {agents.length === 0 && (
           <div className="col-span-full border border-dashed border-zinc-800 py-20 rounded-3xl flex flex-col items-center justify-center text-zinc-500">
             Sem inteligência artificial treinada. O sistema recorrerá aos estáticos.
           </div>
         )}

         {agents.map(agent => (
            <div key={agent.id} className="bg-zinc-950/50 border border-zinc-800/60 rounded-3xl p-6 relative group hover:border-indigo-500/30 transition-colors">
               <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                        <Brain size={20} />
                     </div>
                     <div>
                       <h3 className="font-medium text-zinc-100">{agent.name}</h3>
                       <p className="text-xs text-zinc-500">{agent.provider} | Temp: {agent.temperature}</p>
                     </div>
                  </div>
                  <Switch checked={agent.isActive} onCheckedChange={() => handleToggle(agent.id, agent.isActive)} />
               </div>

               <div className="space-y-2 mt-5">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                     <Network size={14} className="text-zinc-500" /> 
                     <span>{agent.knowledgeBases?.length || 0} Memórias RAG anexadas</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                     <Zap size={14} className="text-amber-500/80" /> 
                     <span>Apoiando {agent._count?.triggerRules || 0} Regras de Venda</span>
                  </div>
               </div>

               <div className="mt-6 flex gap-2">
                  <button onClick={() => openForm(agent)} className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-sm py-2 rounded-xl transition-colors font-medium">
                     Treinar / Editar
                  </button>
                  <button onClick={() => handleDelete(agent.id)} className="w-10 flex items-center justify-center bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-xl border border-rose-500/10 transition-colors">
                     <Trash2 size={16} />
                  </button>
               </div>
            </div>
         ))}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeForm} />
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-zinc-950 border border-zinc-800 shadow-2xl rounded-3xl w-full max-w-4xl relative z-10 max-h-[90vh] flex flex-col">
              
              <div className="shrink-0 sticky border-b border-zinc-800 p-6 flex justify-between items-center bg-zinc-950/80 backdrop-blur rounded-t-3xl">
                 <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2"><Brain className="text-indigo-400" /> {editingId ? 'Reprogramar Cérebro' : 'Forjar Nova IA'}</h2>
                 <button onClick={closeForm} className="text-zinc-500 hover:bg-zinc-900 p-2 rounded-xl transition-colors"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto w-full">
                <form id="ai-form" onSubmit={handleSubmit(onSubmit)} className="p-6">
                   <Tabs defaultValue="core" className="w-full">
                     <TabsList className="grid w-[400px] grid-cols-2 mb-8 bg-zinc-900">
                       <TabsTrigger value="core">Personalidade Core</TabsTrigger>
                       <TabsTrigger value="knowledge">Conhecimento RAG</TabsTrigger>
                     </TabsList>
                     
                     <TabsContent value="core" className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <label className="text-xs font-semibold uppercase text-zinc-500">Nome de Identificação</label>
                             <input {...register("name")} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 text-zinc-100" />
                             {errors.name && <span className="text-xs text-rose-500">{errors.name.message}</span>}
                           </div>
                           <div className="space-y-2">
                             <label className="text-xs font-semibold uppercase text-zinc-500">Motor de Linguagem (Engine)</label>
                             <select {...register("provider")} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:ring-indigo-500">
                                <option value="OPENAI">OpenAI (GPT-4o via .ENV)</option>
                                <option value="ANTHROPIC">Anthropic (Claude)</option>
                                <option value="GOOGLE_VERTEX">Google Vertex (Gemini)</option>
                             </select>
                           </div>
                        </div>

                        <div className="space-y-4 p-5 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl">
                           <div className="flex justify-between items-end mb-2">
                             <label className="text-xs font-semibold uppercase text-zinc-500">Grau de Criatividade / "Temperatura"</label>
                             <span className="text-indigo-400 font-mono font-medium text-sm">{watch('temperature')}</span>
                           </div>
                           <Controller 
                             name="temperature" control={control} 
                             render={({ field }) => (
                               <Slider 
                                  value={[field.value]} max={1} step={0.1}
                                  onValueChange={(val) => field.onChange(val[0])}
                               />
                             )}
                           />
                           <p className="text-[10px] text-zinc-500">0.0 (Engessado e estrito) &mdash; 1.0 (Poético e Criativo).</p>
                        </div>

                        <div className="space-y-2 h-full">
                           <label className="text-xs font-semibold uppercase text-zinc-500">System Prompt (Diretriz Oculta)</label>
                           <Textarea 
                              {...register("systemPrompt")} 
                              placeholder="Você é o especialista de vendas da Loja Y. Nunca dê descontos. Seja direto e persuasa de forma amigável..."
                              className="h-40 font-mono text-sm bg-zinc-950/50"
                           />
                           {errors.systemPrompt && <span className="text-xs text-rose-500">{errors.systemPrompt.message}</span>}
                        </div>
                     </TabsContent>
                     
                     <TabsContent value="knowledge" className="space-y-6">
                         <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-zinc-400">
                              Os blocos abaixo serão lidos ativamente pelo Agente antes de formular e disparar mensagens para seus clientes.
                            </p>
                            <button 
                              type="button" onClick={() => append({ title: '', content: '' })}
                              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <PlusCircle size={14}/> Bloco Regra
                            </button>
                         </div>

                         {fields.length === 0 && (
                            <div className="text-center py-10 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-sm">
                               Nenhum conhecimento injetado. Ele usará as leis puras da própria Inteligência.
                            </div>
                         )}

                         <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 pb-10">
                           {fields.map((item, index) => (
                              <div key={item.id} className="relative bg-zinc-900 border border-zinc-800 p-4 rounded-xl group overflow-hidden">
                                 <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50"></div>
                                 <div className="flex justify-between items-center mb-3">
                                   <input 
                                     {...register(`knowledgeBases.${index}.title` as const)}
                                     placeholder="Ex: Tabela de Frete / FAQ"
                                     className="bg-transparent text-sm font-semibold text-zinc-200 focus:outline-none w-full placeholder:text-zinc-600"
                                   />
                                   <button type="button" onClick={() => remove(index)} className="text-zinc-500 hover:text-rose-500 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Trash2 size={16} />
                                   </button>
                                 </div>
                                 <Textarea 
                                     {...register(`knowledgeBases.${index}.content` as const)}
                                     placeholder="Escreva todo o conteúdo, manual ou as variáveis desta regra..."
                                     className="min-h-[100px] bg-zinc-950 border-zinc-800/80 text-sm text-zinc-300 shadow-inner"
                                 />
                                 {errors.knowledgeBases?.[index]?.content && <span className="text-[10px] text-rose-500 block mt-1">Escreva um conteúdo ou exclua o RAG.</span>}
                              </div>
                           ))}
                         </div>
                     </TabsContent>

                   </Tabs>
                </form>
              </div>

              <div className="shrink-0 p-6 bg-zinc-900/50 border-t border-zinc-800 flex justify-end rounded-b-3xl">
                 <button 
                   disabled={isSubmitting} form="ai-form" type="submit"
                   className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                 >
                   <Save size={18} /> {isSubmitting ? 'Injetando no Banco...' : 'Finalizar Treinamento'}
                 </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
