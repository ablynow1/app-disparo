import { fetchEvoInstances } from '@/actions/instances';
import { InstancesClient } from './InstancesClient';

export const dynamic = 'force-dynamic';

export default async function InstancesPage() {
  const { instances } = await fetchEvoInstances();
  return <InstancesClient initialInstances={instances} />;
}
