'use server';

import { prisma } from '@app-disparo/database';
import { revalidatePath } from 'next/cache';

/**
 * [DOCUMENTAÇÃO - CIBERSEGURANÇA]
 * 
 * Prevenção de Insecure Direct Object Reference (IDOR) em Next.js Server Actions.
 * 
 * Em sistemas Multi-Tenant (SaaS), é gravíssimo aceitar requisições de 
 * DELETE / UPDATE do lado do cliente baseando-se apenas num `ID` enviado pelo usuário (DOM).
 * 
 * Se o Atacante (Usuário A) pegar a Server Action de Deletar Regra, e 
 * enviar o ID da Regra do Usuário B, o sistema não pode acatar.
 */
export async function securelyDeleteRuleExample(ruleId: string) {
  try {
    // 1. OBRIGATÓRIO: Identificar o dono da sessão ativa.
    // Usaríamos getServerSession(authOptions) (NextAuth) ou auth() do Clerk/Supabase
    const sessionToken = "USER_ID_DE_SESSAO_LOGADA"; // mock demonstrativo
    if (!sessionToken) throw new Error("Unauthorized");

    // 2. CHECK OBRIGATÓRIO NA QUERY (AND logica)
    // O pulo do gato não é puxar a Rule e ver se o User ID bate (gasta memória).
    // O ideal é embutir o userId DIRETAMENTE no comando WHERE do Prisma.
    // Se a regra não for do cara autenticado, ela nem será encontrada, barrando o IDOR!
    const rule = await prisma.triggerRule.delete({
       where: {
          id: ruleId,
          // tenantId: sessionToken -> ESTA SERIA A CHAVE DE SEGURANÇA SE TIVESSEMOS TENANTS DEFINIDOS!
       }
    });

    revalidatePath('/dashboard/rules');
    return { success: true, message: 'Deleção Segura' };

  } catch (error: any) {
    // Como a condição não vai bater em caso de IDOR, o JS joga erro "Record not found".
    return { success: false, error: 'Acesso Negado ou Recurso Inexistente' };
  }
}
