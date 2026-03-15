"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evolutionOutboundQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../redis/redis");
exports.evolutionOutboundQueue = new bullmq_1.Queue('evolution-outbound-queue', {
    connection: redis_1.sharedRedisConnection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 5000 // Tenta enviar o webhook pra Evolution em 5s, 25s, 125s (2min)... se falhar
        },
        removeOnComplete: {
            age: 24 * 3600,
            count: 1000,
        },
        removeOnFail: {
            age: 7 * 24 * 3600,
            count: 5000
        }
    }
});
