"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evolutionWebhookQueue = exports.EVOLUTION_WEBHOOK_QUEUE_NAME = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../redis/redis");
exports.EVOLUTION_WEBHOOK_QUEUE_NAME = 'evolution-webhooks';
exports.evolutionWebhookQueue = new bullmq_1.Queue(exports.EVOLUTION_WEBHOOK_QUEUE_NAME, {
    connection: redis_1.sharedRedisConnection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 5000, // 5s, 25s, 125s in case of failure (OpenAI timeout)
        },
        removeOnComplete: {
            age: 24 * 3600,
            count: 1000,
        },
        removeOnFail: {
            age: 7 * 24 * 3600,
            count: 5000
        }
    },
});
