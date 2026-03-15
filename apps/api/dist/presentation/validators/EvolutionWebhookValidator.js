"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvolutionConnectionSchema = exports.EvolutionMessageSchema = void 0;
const zod_1 = require("zod");
// Zod Schema to validate Evolution API's messages.upsert payload
exports.EvolutionMessageSchema = zod_1.z.object({
    event: zod_1.z.literal('messages.upsert'),
    instance: zod_1.z.string().optional(),
    data: zod_1.z.object({
        key: zod_1.z.object({
            remoteJid: zod_1.z.string(), // O número de telefone
            fromMe: zod_1.z.boolean().optional(),
            id: zod_1.z.string().optional(),
        }),
        pushName: zod_1.z.string().optional(),
        message: zod_1.z.object({
            // Mensagem de texto simples
            conversation: zod_1.z.string().optional(),
            // Caso seja mensagen estendida, com menções, etc
            extendedTextMessage: zod_1.z.object({
                text: zod_1.z.string(),
            }).optional(),
        }).passthrough(),
        messageType: zod_1.z.string().optional(),
    }).strict(),
}).strict();
exports.EvolutionConnectionSchema = zod_1.z.object({
    event: zod_1.z.literal('connection.update'),
    instance: zod_1.z.string(),
    data: zod_1.z.object({
        state: zod_1.z.enum(['open', 'close', 'connecting', 'refused']).optional(), // states usually returned by bailey
        statusReason: zod_1.z.number().optional(),
    }).passthrough(),
}).passthrough();
