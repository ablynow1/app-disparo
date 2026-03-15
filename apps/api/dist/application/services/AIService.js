"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const env_1 = require("../../infrastructure/env");
const database_1 = require("@app-disparo/database");
const pino_1 = require("../../infrastructure/logger/pino");
class AIService {
    genAI;
    constructor() {
        this.genAI = new generative_ai_1.GoogleGenerativeAI(env_1.env.GEMINI_API_KEY || 'AIza-mock-key');
    }
    async generateMessage(order, agentId) {
        // 1. DADOS OBRIGATÓRIOS DO RAG E CÉREBRO
        const agent = await database_1.prisma.aIAgent.findUnique({
            where: { id: agentId },
            include: { knowledgeBases: true }
        });
        if (!agent)
            throw new Error('Agente Mestre Inexistente ou Inativo');
        // Inicializa o modelo (geralmente gemini-1.5-flash ou gemini-2.0-flash para operações de Rápida Resposta)
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // 2. CONSTRUÇÃO DO RAG (Concatenação de Conhecimento)
        const ragContext = agent.knowledgeBases.length > 0
            ? `\n\n[Regras e Guias de Atendimento da Empresa (Siga Extremamente)]:\n${agent.knowledgeBases.map((kb) => `--- ${kb.title} ---\n${kb.content}`).join('\n\n')}`
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
        }
        catch (error) {
            pino_1.logger.error({ err: error.message }, '[AIService] Falha bruta na comunicação com a API do Google Gemini');
            throw error; // Re-lança pro OrderRoutingWorker tratar o fallback
        }
    }
    async generateInboundResponse(agentId, currentMessage, history) {
        const agent = await database_1.prisma.aIAgent.findUnique({
            where: { id: agentId },
            include: { knowledgeBases: true }
        });
        if (!agent)
            throw new Error('Agente Inbound Retornado Nulo na Base');
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const ragContext = agent.knowledgeBases.length > 0
            ? `\n\n[Regras e Base de Conhecimento RAG]:\n${agent.knowledgeBases.map((kb) => `* ${kb.title}\n${kb.content}`).join('\n\n')}`
            : '';
        const superSystemPrompt = `${agent.systemPrompt}\n\nVocê está conversando no WhatsApp com um lead da minha loja. Responda de forma natural, curtas e precisas.\n${ragContext}`;
        // Mapeia histórico limitando a quantidade pra não estourar tokens
        const chatHistory = history.map(msg => ({
            role: msg.direction === 'INBOUND' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));
        try {
            const chat = model.startChat({
                history: chatHistory,
                systemInstruction: superSystemPrompt,
                generationConfig: {
                    temperature: agent.temperature,
                }
            });
            const result = await chat.sendMessage(currentMessage);
            return result.response.text();
        }
        catch (error) {
            pino_1.logger.error({ err: error.message }, '[AIService] Falha na geração inbound da Gemini API');
            throw error;
        }
    }
}
exports.AIService = AIService;
