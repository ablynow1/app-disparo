"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../../infrastructure/env");
const database_1 = require("@app-disparo/database");
// Instância dedicada para operações atômicas isoladas das filas
const redisClient = new ioredis_1.default(env_1.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});
class RoutingService {
    /**
     * Executa um Round-Robin distribuído e seguro com base num contador do IORedis.
     * Evita Race Conditions caso os Workers puxem na exata fração de segundo.
     *
     * @param ruleId O ID da Regra de Disparo limitadora do escopo
     * @param instanceJids Lista de Strings dos IDs da Evolution. Ex: ['vitor_1', 'vitor_2']
     */
    async getNextInstance(ruleId, instanceJids) {
        if (!instanceJids || instanceJids.length === 0) {
            throw new Error('Nenhuma instância disponível ativa provida para o RoutingService.');
        }
        // SANITY CHECK: Garante que as instâncias providas não foram desativadas por banimento no DB
        const activeInstancesInDb = await database_1.prisma.instance.findMany({
            where: {
                name: { in: instanceJids },
                status: 'open'
            },
            select: { name: true }
        });
        const safeJids = activeInstancesInDb.map(i => i.name);
        if (safeJids.length === 0) {
            throw new Error(`DELAY_RETRY: Todas as instâncias atreladas à regra [${ruleId}] estão OFFLINE/Desconectadas. O Roteador bloqueou o envio.`);
        }
        if (safeJids.length === 1) {
            // Se só tiver um dono SEGURO, economiza ida ao Redis
            return safeJids[0];
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
exports.RoutingService = RoutingService;
