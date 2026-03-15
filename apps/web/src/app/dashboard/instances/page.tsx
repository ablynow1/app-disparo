import { fetchEvoInstances } from '@/actions/instances';
import { getAiAgents } from '@/actions/ai-agents';
import { InstancesClient } from './InstancesClient';

export const dynamic = 'force-dynamic';

export default async function InstancesPage() {
  const [{ instances }, agents] = await Promise.all([
    fetchEvoInstances(),
    getAiAgents()
  ]);

  return <InstancesClient initialInstances={instances} availableAgents={agents} />;
}
