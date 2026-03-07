import OpenAI from 'openai';
import { env } from '../../infrastructure/env';
import { prisma } from '@app-disparo/database';
import { StandardOrder } from '../adapters/order.adapter';
import { logger } from '../../infrastructure/logger/pino';

export class AIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY || 'sk-mock-key', 
    });
  }

  async generateMessage(order: StandardOrder, agentId: string): Promise<string> {
    // 1. DADOS OBRIGATÓRIOS DO RAG E CÉREBRO
    const agent = await prisma.aIAgent.findUnique({
      where: { id: agentId },
      include: { knowledgeBases: true }
    });

    if (!agent) throw new Error('Agente Mestre Inexistente ou Inativo');

    // 2. CONSTRUÇÃO DO RAG (Concatenação de Conhecimento)
    // Extrai todo txt das bases vinculadas e une p/ injetar como super "Regras da Loja"
    const ragContext = agent.knowledgeBases.length > 0
      ? `\n\n[Regras e Guias de Atendimento da Empresa (Siga Extremamente)]:\n${agent.knowledgeBases.map((kb: any) => `--- ${kb.title} ---\n${kb.content}`).join('\n\n')}`
      : '';

    const superSystemPrompt = `${agent.systemPrompt}${ragContext}`;

    // 3. O RESUMO DINÂMICO PARA O AGENTE
    const userPrompt = `[DADOS DA VENDA]:
Nome do Cliente: ${order.customerName}
Status no Sistema: ${order.status}
Valor do Custo: R$ ${order.totalAmount}
Provedor de E-commerce: ${order.integrationProvider}

[INSTRUÇÃO AO LLM]:
Escreva APENAS O TEXTO da mensagem final pura que será disparada pro WhatsApp do cliente para tentar converter essa venda ou agradecer. Não invente placeholders, me dê o texto pronto! Respeite o perfil e regras da empresa acima.`;

    // 4. CHAMADA GERADORA OTIMIZADA PARA FAST-RESPONSE (SEM TRAVAR A FILA)
    try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini', // Escolha de alta velocidade e baixo custo para disparos em massa
          temperature: agent.temperature,
          messages: [
            { role: 'system', content: superSystemPrompt },
            { role: 'user', content: userPrompt }
          ]
        }, { timeout: 10000 }); // Hard-limit na SDK: se a OpenAI enrolar 10s, throw error pra cair no Fallback

        return response.choices[0]?.message?.content || '[Erro na geração textual]';
    } catch (error: any) {
        logger.error({ err: error.message }, '[AIService] Falha bruta na comunicação com a OpenAI API');
        throw error; // Re-lança pro OrderRoutingWorker tratar o fallback
    }
  }
}
