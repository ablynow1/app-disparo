import { getAiAgents } from '@/actions/ai-agents';
import { AgentsClient } from './AgentsClient';
import { BrainCircuit } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AiAgentsPage() {
  let agents: any[] = [];
  let dbError: string | null = null;

  try {
    agents = await getAiAgents();
  } catch (error: any) {
    dbError = error?.message || error?.toString() || 'Erro desconhecido';
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 flex items-center gap-3">
          <BrainCircuit className="text-indigo-400" /> Laboratório de Inteligência
        </h1>
        <p className="text-sm text-zinc-400 max-w-2xl">
          Crie Personas e treine sua Inteligência Artificial RAG. Os Agentes aqui listados 
          são plugáveis diretamente nas suas Regras de Disparo.
        </p>
      </div>

      {dbError && (
        <div className="bg-red-950/20 border border-red-500/50 p-4 rounded-2xl text-red-400 text-sm font-mono">
          ⚠️ Falha no banco: {dbError}
        </div>
      )}

      <AgentsClient initialAgents={agents} />
    </div>
  );
}
