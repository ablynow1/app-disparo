import { logger } from '../logger/pino';
import { env } from '../env';

export class EvolutionApiService {
  static async sendText(instanceName: string, remoteJid: string, text: string): Promise<void> {
    const apiUrl = process.env.EVOLUTION_API_URL || 'http://192.168.100.13:8085';
    const apiKey = env.EVOLUTION_API_KEY || '123456';
      
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

      logger.info(`[EvolutionApiService] 🚀 Resposta enviada com sucesso para ${number}`);
      
    } catch (error) {
      logger.error({ err: error }, '[EvolutionApiService] Falha ao disparar mensagem.');
      throw error;
    }
  }
}
