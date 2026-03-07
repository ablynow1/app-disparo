import Redis from 'ioredis';
import { env } from '../../infrastructure/env';

// Instância dedicada para operações atômicas isoladas das filas
const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export class RoutingService {
  /**
   * Executa um Round-Robin distribuído e seguro com base num contador do IORedis.
   * Evita Race Conditions caso os Workers puxem na exata fração de segundo.
   * 
   * @param ruleId O ID da Regra de Disparo limitadora do escopo
   * @param instanceJids Lista de Strings dos IDs da Evolution. Ex: ['vitor_1', 'vitor_2']
   */
  async getNextInstance(ruleId: string, instanceJids: string[]): Promise<string> {
    if (!instanceJids || instanceJids.length === 0) {
      throw new Error('Nenhuma instância disponível ativa provida para o RoutingService.');
    }

    if (instanceJids.length === 1) {
      // Se só tiver um dono, economiza ida ao Redis
      return instanceJids[0];
    }

    // Chave única para o ponteiro daquela regra específica
    const redisKey = `routing:rule:${ruleId}:currentIndex`;

    // OPERAÇÃO ATÔMICA: Se 50 reqs baterem ao mesmo tempo,
    // o Redis tranca o número na hora e incrementa de um em um no núcleo de Thread dele.
    const counter = await redisClient.incr(redisKey);

    // O pulo do Gato (Lógica Modular Cíclica).
    // Ex: counter = 3, instancias.length = 2. Index será (3-1) % 2 = 0.
    const currentIndex = (counter - 1) % instanceJids.length;

    return instanceJids[currentIndex];
  }
}
