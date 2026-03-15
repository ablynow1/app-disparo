"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRoutingQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../redis/redis");
exports.orderRoutingQueue = new bullmq_1.Queue('order-routing-queue', {
    connection: redis_1.sharedRedisConnection,
    defaultJobOptions: {
        attempts: 5, // Tenta mandar o Pix Pendente 5 Vezes se der erro de rede
        backoff: {
            type: 'exponential',
            delay: 5000 // Tenta em 5s, depois 25s, 125s (2min)...
        },
        removeOnComplete: {
            age: 24 * 3600, // Mantém sucessos na RAM por 24 horas apenas (para métricas)
            count: 1000, // Mas apaga se passar de 1.000 sucessos acumulados num mesmo dia
        },
        removeOnFail: {
            age: 7 * 24 * 3600, // Segura falhas por no máximo 7 dias para debugar
            count: 5000 // Ou deleta se a fila de Erros passar de 5.000 de volume
        }
    }
});
