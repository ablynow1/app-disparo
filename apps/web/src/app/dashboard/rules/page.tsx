import { getRulesData } from '@/actions/rules';
import { RulesClient } from './RulesClient';
import { Route, BrainCircuit } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RulesPage() {
  const { rules, instances, agents } = await getRulesData();

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

      <RulesClient 
         initialRules={rules} 
         instances={instances} 
         agents={agents} 
      />
    </div>
  );
}
