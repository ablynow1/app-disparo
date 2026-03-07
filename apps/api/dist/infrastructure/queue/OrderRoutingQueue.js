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
        removeOnComplete: true, // Auto-Limpante pra não lotar a RAM
        removeOnFail: false // Deixa visível pra debug em DLQ
    }
});
