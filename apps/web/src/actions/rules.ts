'use server';

import { prisma, EventType, RoutingStrategy } from '@app-disparo/database';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

const ruleSchema = z.object({
  name: z.string().min(3, "Nome muito curto"),
  eventType: z.enum(['ABANDONED_CART', 'PIX_PENDING', 'ORDER_PAID', 'ORDER_CANCELED']),
  delayMinutes: z.coerce.number().min(0),
  active: z.boolean().default(true),
  routingStrategy: z.enum(['ROUND_ROBIN', 'RANDOM']).default('ROUND_ROBIN'),
  instanceIds: z.array(z.string()).min(1, 'Selecione pelo menos uma Instância de WhatsApp'),
  agentId: z.string().optional().nullable(),
});

export async function getRulesData() {
  const [rawRules, instances, agents] = await Promise.all([
    prisma.triggerRule.findMany({
      include: {
        instances: {
          include: { instance: true }  // TriggerRuleInstance -> Instance
        },
        agent: true
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.instance.findMany({ where: { status: 'open' } }),
    prisma.aIAgent.findMany({ where: { isActive: true } })
  ]);

  // Normaliza para o formato esperado pelo RulesClient (instances flat, não aninhados)
  const rules = rawRules.map(r => ({
    ...r,
    instances: r.instances.map((ri: any) => ri.instance)
  }));

  return { rules, instances, agents };
}

export async function createOrUpdateRule(formData: FormData, ruleId?: string) {
  try {
    const data = {
      name: formData.get('name'),
      eventType: formData.get('eventType'),
      routingStrategy: formData.get('routingStrategy'),
      delayMinutes: formData.get('delayMinutes'),
      active: formData.get('active') === 'on' || formData.get('active') === 'true',
      instanceIds: formData.getAll('instanceIds'),
      agentId: formData.get('agentId') || null,
    };

    const parsed = ruleSchema.parse(data);

    if (ruleId) {
      // Update: deleta relações antigas e cria novas via tabela de junção (Postgres)
      await (prisma as any).triggerRuleInstance.deleteMany({ where: { triggerRuleId: ruleId } });
      await prisma.triggerRule.update({
        where: { id: ruleId },
        data: {
          name: parsed.name,
          eventType: parsed.eventType,
          routingStrategy: parsed.routingStrategy,
          delayMinutes: parsed.delayMinutes,
          active: parsed.active,
          agentId: parsed.agentId,
          instances: {
            create: parsed.instanceIds.map(instanceId => ({ instanceId }))
          }
        }
      });
    } else {
      // Create com instâncias via tabela de junção
      await prisma.triggerRule.create({
        data: {
          name: parsed.name,
          eventType: parsed.eventType,
          routingStrategy: parsed.routingStrategy,
          delayMinutes: parsed.delayMinutes,
          active: parsed.active,
          agentId: parsed.agentId,
          instances: {
            create: parsed.instanceIds.map(instanceId => ({ instanceId }))
          }
        }
      });
    }

    revalidatePath('/dashboard/rules');
    // @ts-ignore: Bug da lib de types do next/cache nesta versão pedindo 2 parametros
    revalidateTag('disparos-metrics');
    return { success: true };
  } catch (error: any) {
    console.error('SERVER ACTION ERROR:', error);
    return { success: false, error: error.message };
  }
}

export async function toggleRuleActive(id: string, active: boolean) {
  await prisma.triggerRule.update({ where: { id }, data: { active } });
  revalidatePath('/dashboard/rules');
  // @ts-ignore
  revalidateTag('disparos-metrics');
}

export async function deleteRule(id: string) {
  await prisma.triggerRule.delete({ where: { id } });
  revalidatePath('/dashboard/rules');
  // @ts-ignore
  revalidateTag('disparos-metrics');
}
