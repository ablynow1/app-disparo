'use server';

import { prisma } from '@app-disparo/database';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const agentSchema = z.object({
  name: z.string().min(3, "Nome muito curto"),
  provider: z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE_VERTEX']).default('OPENAI'),
  isActive: z.boolean().default(true),
  temperature: z.coerce.number().min(0).max(1),
  systemPrompt: z.string().min(10, 'Prompt muito curto. Dê instruções mais claras pro Robô.'),
  
  // O array dinâmico N:N do RAG Base Conhecimento
  knowledgeBases: z.array(z.object({
     title: z.string().min(2),
     content: z.string().min(5),
  })).optional().default([]),
});

/**
 * Retorna todos os Agentes Inteligentes com os Bancos RAG Populados 
 */
export async function getAiAgents() {
  return prisma.aIAgent.findMany({
    include: {
      knowledgeBases: true,
      _count: {
        select: { triggerRules: true } // Quantas regras tão plugadas nesse cérebro
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Cria ou Atualiza um Agent dando Flush Total na KnowledgeBase 
 * e reconstruindo os blocos de texto fornecidos no array do Front-end.
 */
export async function saveAiAgent(formDataRaw: any, agentId?: string) {
  try {
    const parsed = agentSchema.parse(formDataRaw);

    if (agentId) {
      // UPDATE c/ recriação da Árvore O:N (flush mental do RAG antigo)
      await prisma.aIAgent.update({
        where: { id: agentId },
        data: {
          name: parsed.name,
          provider: parsed.provider,
          temperature: parsed.temperature,
          isActive: parsed.isActive,
          systemPrompt: parsed.systemPrompt,
          knowledgeBases: {
             deleteMany: {}, // Obliterar cérebros de treinamento antigos
             create: parsed.knowledgeBases.map(kb => ({
                title: kb.title,
                content: kb.content
             }))
          }
        }
      });
    } else {
      // CREATE
      await prisma.aIAgent.create({
        data: {
          name: parsed.name,
          provider: parsed.provider,
          temperature: parsed.temperature,
          isActive: parsed.isActive,
          systemPrompt: parsed.systemPrompt,
          knowledgeBases: {
             create: parsed.knowledgeBases.map(kb => ({
                title: kb.title,
                content: kb.content
             }))
          }
        }
      });
    }

    revalidatePath('/dashboard/ai-agents');
    revalidatePath('/dashboard/rules'); // Atualizar combo da tela de regras tbm
    return { success: true };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Campos Inválidos', validationErrors: error.errors };
    }
    console.error('SERVER ACTION RAG ERROR:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteAiAgent(id: string) {
  try {
    // Delete CASCADE vai apagar as knowledgeBases automaticamente pelo Prisma!
    await prisma.aIAgent.delete({ where: { id } });
    revalidatePath('/dashboard/ai-agents');
    revalidatePath('/dashboard/rules');
    return { success: true };
  } catch(e: any) {
     return { success: false, error: 'Falha ao Deletar o Cérebro' };
  }
}

export async function toggleAiAgentAuth(id: string, active: boolean) {
  try {
     await prisma.aIAgent.update({ where: { id }, data: { isActive: active } });
     revalidatePath('/dashboard/ai-agents');
     return { success: true };
  } catch(e: any) {
     return { success: false };
  }
}
