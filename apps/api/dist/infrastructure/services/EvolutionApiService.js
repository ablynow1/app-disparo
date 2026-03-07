"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvolutionApiService = void 0;
const pino_1 = require("../logger/pino");
const env_1 = require("../env");
class EvolutionApiService {
    static async sendText(instanceName, remoteJid, text) {
        const apiUrl = process.env.EVOLUTION_API_URL || 'http://192.168.100.13:8085';
        const apiKey = env_1.env.EVOLUTION_API_KEY || '123456';
        try {
            const endpoint = `${apiUrl}/message/sendText/${instanceName}`;
            // Extrai apenas os números do JID (ex: de 553499999999@s.whatsapp.net para 553499999999)
            const number = remoteJid.split('@')[0];
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': apiKey,
                },
                body: JSON.stringify({
                    number: number,
                    textMessage: {
                        text: text,
                    },
                    delay: 1500, // Um pequeno delay para parecer humano digitando
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro na Evolution API: ${JSON.stringify(errorData)}`);
            }
            pino_1.logger.info(`[EvolutionApiService] 🚀 Resposta enviada com sucesso para ${number}`);
        }
        catch (error) {
            pino_1.logger.error({ err: error }, '[EvolutionApiService] Falha ao disparar mensagem.');
            throw error;
        }
    }
}
exports.EvolutionApiService = EvolutionApiService;
