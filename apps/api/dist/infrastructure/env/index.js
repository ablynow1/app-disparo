"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().default(3000),
    REDIS_URL: zod_1.z.string().url(),
    EVOLUTION_API_URL: zod_1.z.string().url().optional(),
    EVOLUTION_API_KEY: zod_1.z.string().optional(),
    INSTANCE_NAME: zod_1.z.string().optional(),
    OPENAI_API_KEY: zod_1.z.string().optional(),
    WEBHOOK_GLOBAL_SECRET: zod_1.z.string().default('default-secret-change-me'),
});
const _env = envSchema.safeParse(process.env);
if (!_env.success) {
    console.error('❌ Invalid environment variables', _env.error.format());
    throw new Error('Invalid environment variables.');
}
exports.env = _env.data;
