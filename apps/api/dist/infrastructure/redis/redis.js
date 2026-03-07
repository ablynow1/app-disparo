"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sharedRedisConnection = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../env");
/**
 * PADRÃO DE ALTA PERFORMANCE: Conexão Multiplexada do Redis.
 * O modo padrão do BullMQ é instanciar 1 conexão Redis por Fila/Worker.
 * Isso significa que se tivermos 5 filas e 5 workers, usaremos 30 conexões exclusivas.
 * Com tráfego insano (DDoS ou Black Friday), o Redis no Docker desaba (Too Many Connections).
 *
 * Ao invés disso, nós instanciamos O REDIS aqui isoladamente (uma única vez)
 * e marcamos `maxRetriesPerRequest: null` (obrigatório pro BullMQ).
 * Todas as Queues e Workers do SaaS reutilizarão este mesmo cano TCP/IP (Multiplexing).
 */
exports.sharedRedisConnection = new ioredis_1.default(env_1.env.REDIS_URL, {
    maxRetriesPerRequest: null, // Obrigatório para o BullMQ
    enableReadyCheck: false, // Economiza tempo no ping de boot
});
// Tratamento global de erros para o Socket do DB
exports.sharedRedisConnection.on('error', (err) => {
    console.error('[REDIS MULTIPLEX] Erro na Conexão Global:', err);
});
