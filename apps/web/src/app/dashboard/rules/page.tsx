import { getRulesData } from '@/actions/rules';
import { RulesClient } from './RulesClient';
import { Route, BrainCircuit } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RulesPage() {
  let rules: any[] = [], instances: any[] = [], agents: any[] = [];
  let dbError: string | null = null;

  try {
    const data = await getRulesData();
    rules = data.rules;
    instances = data.instances;
    agents = data.agents;
  } catch (error: any) {
    dbError = error?.message || error?.toString() || 'Erro desconhecido';
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 flex items-center gap-3">
          <Route className="text-indigo-400" /> Gatilhos e Regras
        </h1>
        <p className="text-sm text-zinc-400 max-w-2xl">
          Configure a mente do seu negócio. As regras enviam mensagens automáticas de forma 
          aleatória/rodízio nas instâncias e podem ter <strong className="text-indigo-400 font-medium whitespace-nowrap"><BrainCircuit className="inline w-4 h-4 mr-1"/>Agentes RAG de IA</strong> vinculados ao longo do tempo.
        </p>
      </div>

      {dbError && (
        <div className="bg-red-950/20 border border-red-500/50 p-4 rounded-2xl text-red-400 text-sm font-mono">
          ⚠️ Falha no banco: {dbError}
        </div>
      )}

      <RulesClient 
         initialRules={rules} 
         instances={instances} 
         agents={agents} 
      />
    </div>
  );
}
