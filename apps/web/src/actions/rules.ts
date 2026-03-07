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
  const [rules, instances, agents] = await Promise.all([
    prisma.triggerRule.findMany({
      include: { instances: true, agent: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.instance.findMany({ where: { status: 'open' } }), // Só traz Zaps ativos pra vincular
    prisma.aIAgent.findMany({ where: { isActive: true } })   // Só IAs ligadas
  ]);
  
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
      instanceIds: formData.getAll('instanceIds'), // AQUI A MÁGICA N:N - O front passa múltiplos checkboxes
      agentId: formData.get('agentId') || null,
    };

    const parsed = ruleSchema.parse(data);

    if (ruleId) {
      // Update DB com disconnect de todos os relations velhos e Connect Nos novos
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
             set: [], // Reseta as antigas
             connect: parsed.instanceIds.map(id => ({ id })) // Linka as novas 100% RoundRobin
          }
        }
      });
    } else {
      // Create DB c/ as instâncias conectadas
      await prisma.triggerRule.create({
        data: {
          name: parsed.name,
          eventType: parsed.eventType,
          routingStrategy: parsed.routingStrategy,
          delayMinutes: parsed.delayMinutes,
          active: parsed.active,
          agentId: parsed.agentId,
          instances: {
            connect: parsed.instanceIds.map(id => ({ id }))
          }
        }
      });
    }

    revalidatePath('/dashboard/rules');
    // @ts-ignore: Bug da lib de types do next/cache nesta versão pedindo 2 parametros
    revalidateTag('disparos-metrics'); // Invalidação Cirúrgica do Cache do Header Front-end Dashboard
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
