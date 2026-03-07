import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../infrastructure/env';
import { prisma } from '@app-disparo/database';
import { StandardOrder } from '../adapters/order.adapter';
import { logger } from '../../infrastructure/logger/pino';

export class AIService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || 'AIza-mock-key');
  }

  async generateMessage(order: StandardOrder, agentId: string): Promise<string> {
    // 1. DADOS OBRIGATÓRIOS DO RAG E CÉREBRO
    const agent = await prisma.aIAgent.findUnique({
      where: { id: agentId },
      include: { knowledgeBases: true }
    });

    if (!agent) throw new Error('Agente Mestre Inexistente ou Inativo');

    // Inicializa o modelo (geralmente gemini-1.5-flash ou gemini-2.0-flash para operações de Rápida Resposta)
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 2. CONSTRUÇÃO DO RAG (Concatenação de Conhecimento)
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

    // 4. CHAMADA GERADORA OTIMIZADA PARA FAST-RESPONSE
    try {
        const result = await model.generateContent({
           contents: [{ role: "user", parts: [{ text: userPrompt }] }],
           systemInstruction: superSystemPrompt,
           generationConfig: {
             temperature: agent.temperature,
           }
        });

        const response = result.response;
        return response.text() || '[Erro na geração textual]';
    } catch (error: any) {
        logger.error({ err: error.message }, '[AIService] Falha bruta na comunicação com a API do Google Gemini');
        throw error; // Re-lança pro OrderRoutingWorker tratar o fallback
    }
  }
}
