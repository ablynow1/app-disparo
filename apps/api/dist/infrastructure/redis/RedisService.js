"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../env");
const pino_1 = require("../logger/pino");
class RedisService {
    redis;
    constructor() {
        this.redis = new ioredis_1.default(env_1.env.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
        });
        this.redis.on('error', (err) => pino_1.logger.error({ err }, 'Redis connection error'));
        this.redis.on('connect', () => pino_1.logger.info('🔗 Redis connected'));
    }
    async ping() {
        return this.redis.ping();
    }
    async get(key) {
        return this.redis.get(key);
    }
    async set(key, value, ttl) {
        if (ttl) {
            await this.redis.set(key, value, 'EX', ttl);
        }
        else {
            await this.redis.set(key, value);
        }
    }
    async del(key) {
        await this.redis.del(key);
    }
    async disconnect() {
        await this.redis.quit();
    }
}
exports.RedisService = RedisService;
